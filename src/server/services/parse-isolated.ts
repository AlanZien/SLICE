/**
 * Isolated, resource-bounded OpenAPI parsing (D004 — anti-OOM / anti-DoS).
 *
 * `parseSpec` can OOM the whole process on a pathological `$ref` explosion (a
 * valid 3 MB spec → >2 GB) — the cooperative timeout can't stop CPU-bound
 * deref. So we run it in a throwaway `child_process`:
 *   - **primary guard** = parent wall-clock timeout that `kill()`s the child
 *     (the spike showed a memory-cap OOM can grind ~132 s before aborting);
 *   - **backstop** = `--max-old-space-size` heap cap (OOM → the child dies, the
 *     parent survives);
 *   - error contract = the child writes one JSON line `{ ok, code, message }`;
 *     a known `code` is rebuilt into a `ParseError`, no usable output → the
 *     outcome is classified (`PARSE_TIMEOUT` if we killed it, else
 *     `PARSE_TOO_COMPLEX`).
 *
 * Only cold paths parse (`/api/upload`, `/api/generate`, `/api/host`); the
 * hosted runtime never re-parses, so agent latency is untouched.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ParseError, type ParsedSpec, type ParseErrorCode } from '@shared/types';

const MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_MEMORY_MB = 512;
const DEFAULT_TIMEOUT_MS = 8000;
// Cap accumulated child stdout — defense in depth so a runaway child can't grow
// the parent's memory unbounded.
const MAX_STDOUT_BYTES = 32 * 1024 * 1024;

/** Codes the child is allowed to tunnel back; anything else → generic. */
const KNOWN_CODES = new Set<ParseErrorCode>([
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_FORMAT',
  'INVALID_SPEC',
  'EMPTY_SPEC',
  'UNSUPPORTED_VERSION',
  'UNSUPPORTED_AUTH',
  'SWAGGER2_CONVERSION_FAILED',
  'POSTMAN_CONVERSION_FAILED',
  'PARSE_TIMEOUT',
  'PARSE_DEPTH_EXCEEDED',
  'PARSE_TOO_COMPLEX',
]);

export interface ParseIsolatedOptions {
  sizeBytes: number;
  /** Child heap cap (MB). Lower in tests for a faster OOM. Default 512. */
  maxMemoryMb?: number;
  /** Parent wall-clock timeout (ms) — the authoritative guard. Default 8000. */
  timeoutMs?: number;
}

// Resolve the child entry by the CURRENT module's extension — deterministic in
// dev (`.ts` under tsx), prod (`.js` compiled) and test. The sibling sits in
// the same directory in every mode.
const childIsTs = import.meta.url.endsWith('.ts');
const CHILD_PATH = fileURLToPath(
  new URL(childIsTs ? './parse-child.ts' : './parse-child.js', import.meta.url)
);

/** No usable child output → which error does it mean? */
export function classifyExit(timedOut: boolean): ParseErrorCode {
  return timedOut ? 'PARSE_TIMEOUT' : 'PARSE_TOO_COMPLEX';
}

/**
 * Thrown when too many parses are already running/queued. NOT a `ParseErrorCode`
 * — the spec is fine, the server is momentarily busy → routes map it to 429.
 */
export class ParseBusyError extends Error {
  constructor(message = 'Too many specs are being processed. Please retry shortly.') {
    super(message);
    this.name = 'ParseBusyError';
  }
}

// Singleton semaphore shared by every entry point (upload + reparse) so the
// effective concurrency — and thus peak memory (cap × concurrency) — is bounded
// once, not per-route. Limits read lazily so deployment/tests can tune them.
let inFlight = 0;
const waiters: Array<() => void> = [];
function limits(): { maxConcurrent: number; maxQueue: number } {
  return {
    maxConcurrent: Math.max(1, Number(process.env.PARSE_MAX_CONCURRENT ?? 3)),
    maxQueue: Math.max(0, Number(process.env.PARSE_MAX_QUEUE ?? 12)),
  };
}
async function acquire(): Promise<void> {
  const { maxConcurrent, maxQueue } = limits();
  if (inFlight < maxConcurrent) {
    inFlight += 1;
    return;
  }
  if (waiters.length >= maxQueue) throw new ParseBusyError();
  await new Promise<void>((res) => waiters.push(res)); // slot is handed over by release()
}
function release(): void {
  const next = waiters.shift();
  if (next) next(); // transfer the slot to a waiter — inFlight unchanged
  else inFlight -= 1;
}

interface ChildResult {
  ok: boolean;
  parsed?: ParsedSpec;
  code?: string | null;
  message?: string;
}

export async function parseSpecIsolated(
  raw: string,
  opts: ParseIsolatedOptions
): Promise<ParsedSpec> {
  // 10 MB guard BEFORE acquiring a slot or spawning — never queue/start a
  // process for a spec we already know is too large (anti spawn-spam).
  if (opts.sizeBytes > MAX_BYTES) {
    throw new ParseError('PAYLOAD_TOO_LARGE', `File exceeds the 10 MB limit (${opts.sizeBytes} bytes).`);
  }

  await acquire();
  try {
    return await runChild(raw, opts);
  } finally {
    release();
  }
}

async function runChild(raw: string, opts: ParseIsolatedOptions): Promise<ParsedSpec> {
  const memoryMb = opts.maxMemoryMb ?? DEFAULT_MEMORY_MB;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  // Cap memory via argv only; scrub inherited NODE_OPTIONS so a deploy-time
  // `--max-old-space-size` / `--inspect` can't override or clash.
  const args = [`--max-old-space-size=${memoryMb}`, ...(childIsTs ? ['--import', 'tsx'] : []), CHILD_PATH];

  return await new Promise<ParsedSpec>((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'ignore'],
      // Allowlisted env — the child only parses untrusted specs, so it inherits
      // NO server secrets. NODE_OPTIONS is scrubbed so a deploy-time
      // `--max-old-space-size`/`--inspect` can't override our argv cap.
      env: {
        PATH: process.env.PATH ?? '',
        HOME: process.env.HOME ?? '',
        NODE_ENV: process.env.NODE_ENV ?? '',
        NODE_OPTIONS: '',
      },
    });

    let out = '';
    let timedOut = false;
    let settled = false;

    const settle = (run: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!child.killed) child.kill('SIGKILL'); // guaranteed cleanup (I-5)
      run();
    };

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (d) => {
      out += d;
      if (out.length > MAX_STDOUT_BYTES) {
        settle(() =>
          reject(new ParseError('PARSE_TOO_COMPLEX', 'The parsed result is unexpectedly large.'))
        );
      }
    });
    child.on('error', (e) =>
      settle(() => reject(new ParseError('PARSE_TOO_COMPLEX', `Isolated parse failed: ${e.message}`)))
    );
    child.on('close', () => {
      if (out) {
        try {
          const msg = JSON.parse(out) as ChildResult;
          if (msg.ok && msg.parsed) return settle(() => resolve(msg.parsed as ParsedSpec));
          if (msg.ok === false) {
            const code =
              msg.code && KNOWN_CODES.has(msg.code as ParseErrorCode)
                ? (msg.code as ParseErrorCode)
                : 'INVALID_SPEC';
            return settle(() => reject(new ParseError(code, msg.message ?? 'Failed to parse the spec.')));
          }
        } catch {
          // malformed stdout → fall through to crash classification
        }
      }
      // No usable output → the child died (OOM/crash) or was killed (timeout).
      settle(() =>
        reject(
          new ParseError(
            classifyExit(timedOut),
            timedOut
              ? 'Parsing the spec timed out.'
              : 'This API description is too complex to process (too many nested references).'
          )
        )
      );
    });

    child.stdin.end(raw);
  });
}

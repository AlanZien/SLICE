/**
 * Isolated parse worker (D004) — runs in a throwaway child_process so a
 * pathological spec (e.g. a `$ref` explosion that OOMs) kills only THIS process,
 * never the server. Spawned by `parse-isolated.ts`.
 *
 * I/O contract (C1): the parent writes the raw spec to stdin and closes it;
 * this process reads to EOF, computes its own `sizeBytes`, runs the real
 * `parseSpec`, and writes exactly ONE JSON line on stdout —
 * `{ ok: true, parsed }` or `{ ok: false, code, message }` — then exits. The
 * internal cooperative timeout is disabled (huge value): the PARENT's
 * wall-clock timeout is the authoritative guard (it can kill this process).
 */
import { parseSpec } from './parser';
import { ParseError } from '@shared/types';

// ~23 days — effectively disables the internal Promise.race timeout (which is
// cooperative and can't stop CPU-bound deref anyway). The parent kills us.
const NO_INTERNAL_TIMEOUT = 2_000_000_000;

let raw = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => {
  raw += chunk;
});
process.stdin.on('end', async () => {
  try {
    const parsed = await parseSpec(raw, {
      sizeBytes: Buffer.byteLength(raw),
      timeoutMs: NO_INTERNAL_TIMEOUT,
    });
    process.stdout.write(JSON.stringify({ ok: true, parsed }));
  } catch (err) {
    const code = err instanceof ParseError ? err.code : null;
    const message = err instanceof Error ? err.message : String(err);
    process.stdout.write(JSON.stringify({ ok: false, code, message }));
  }
});

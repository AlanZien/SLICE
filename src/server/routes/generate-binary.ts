/**
 * Phase 11 — POST /api/generate-binary?target=<target>
 *
 * Sibling of /api/generate. Same validation + re-parse + endpoint whitelist
 * pipeline; only the terminal step differs: instead of streaming a ZIP of
 * source files, we hand the files to `buildBinary` and stream the resulting
 * compiled executable.
 *
 * Why a separate route (not a `?format=` switch on /api/generate):
 *   - Different timeout budget (binary compile is 5-10x slower than zip)
 *   - Different content type and naming convention
 *   - Different failure modes (Bun missing, cross-compile failure)
 *   - Keeps the original ZIP route stable for clients that still want source
 */
import { Router, type RequestHandler, json } from 'express';
import { generateRequestSchema } from '@shared/config-schema';
import { ApiError, type ApiErrorPayload, type Endpoint } from '@shared/types';
import { parseSpec } from '../services/parser';
import { generateMcp } from '../services/mcp-generator';
import {
  buildBinary,
  BINARY_TARGETS,
  type BinaryTarget,
} from '../services/binary-builder';

const BODY_LIMIT = '15mb';
// Compile is the long pole. 30 s service budget + 30 s slack for transport
// & client buffering. See PLAN.md phase 11 step 7.
const GENERATE_TIMEOUT_MS = 60_000;

function isBinaryTarget(v: string): v is BinaryTarget {
  return (BINARY_TARGETS as readonly string[]).includes(v);
}

export function createGenerateBinaryRouter(): Router {
  const router = Router();

  router.use(json({ limit: BODY_LIMIT }));

  router.use(((err, _req, res, next) => {
    if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.too.large') {
      res.status(413).json(payload('PAYLOAD_TOO_LARGE', 'Spec is too large (max 15 MB).'));
      return;
    }
    next(err);
  }) as import('express').ErrorRequestHandler);

  router.post('/', handleGenerateBinary);
  return router;
}

const handleGenerateBinary: RequestHandler = async (req, res, next) => {
  // ─── 1. Target check (cheap, before schema) ────────────────────────────
  const rawTarget = typeof req.query.target === 'string' ? req.query.target : '';
  if (!rawTarget || !isBinaryTarget(rawTarget)) {
    res.status(400).json(
      payload(
        'INVALID_TARGET',
        `Unknown target. Expected one of: ${BINARY_TARGETS.join(', ')}.`
      )
    );
    return;
  }
  const target: BinaryTarget = rawTarget;

  // ─── 2. Schema check ───────────────────────────────────────────────────
  const parsed = generateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(payload('INVALID_SPEC', firstZodMessage(parsed.error)));
    return;
  }
  const body = parsed.data;

  try {
    await withTimeout(
      runCompile(body, target, res),
      GENERATE_TIMEOUT_MS,
      () => new ApiError('TIMEOUT', 'Binary build timed out.', 504)
    );
  } catch (err) {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    if (err instanceof ApiError) {
      res.status(err.status).json(payload(err.code, err.message));
      return;
    }
    next(err);
  }
};

interface ValidatedBody {
  parsedSpec: unknown;
  rawSpec: string;
  selectedIds: string[];
  config: Parameters<typeof generateMcp>[0]['config'];
}

async function runCompile(
  body: ValidatedBody,
  target: BinaryTarget,
  res: import('express').Response
): Promise<void> {
  // Re-parse (R1.4.1bis)
  let reparsed;
  try {
    reparsed = await parseSpec(body.rawSpec, { sizeBytes: Buffer.byteLength(body.rawSpec) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[generate-binary] re-parse failed:', err instanceof Error ? err.message : err);
    throw new ApiError('INVALID_SPEC', 'Failed to re-parse the spec.', 400);
  }

  // Whitelist selectedIds against the freshly-parsed endpoints
  const knownIds = new Set(
    reparsed.groups.flatMap((g) => g.endpoints.map((e: Endpoint) => e.id))
  );
  const validIds = body.selectedIds.filter((id) => knownIds.has(id));
  if (validIds.length === 0) {
    throw new ApiError(
      'NO_ENDPOINT_SELECTED',
      'None of the selected endpoints were found in the parsed spec.',
      400
    );
  }

  // Generate the bundle (same path as ZIP route — we want bit-for-bit
  // identical sources so a "ZIP it / build it" comparison stays trivial)
  let files;
  try {
    files = generateMcp({
      parsedSpec: reparsed,
      rawSpec: body.rawSpec,
      selectedIds: validIds,
      config: body.config,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[generate-binary] generation failed:', err instanceof Error ? err.stack : err);
    throw new ApiError('GENERATION_FAILED', 'Bundle generation failed.', 500);
  }

  // Compile to a single executable
  let bin: Buffer;
  try {
    bin = await buildBinary(files, target);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[generate-binary] compile failed:', err instanceof Error ? err.stack : err);
    throw new ApiError('COMPILE_FAILED', 'Binary compilation failed.', 500);
  }

  // Stream the binary
  const safeName = body.config.mcpName.replace(/[^a-z0-9-]/gi, '');
  const ext = target === 'windows-x64' ? '.exe' : '';
  const filename = `${safeName}-${target}${ext}`;
  res.status(200);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', String(bin.length));
  res.end(bin);
}

function payload(code: ApiErrorPayload['code'], message: string): ApiErrorPayload {
  return { code, message };
}

function firstZodMessage(err: import('zod').ZodError): string {
  const issue = err.issues[0];
  if (!issue) return 'Invalid request body.';
  const path = issue.path.length ? `${issue.path.join('.')}: ` : '';
  return `${path}${issue.message}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => Error): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(onTimeout()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer!));
}

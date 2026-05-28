/**
 * Phase 08 — POST /api/generate
 *
 * Re-validates the request, re-parses the spec (R1.4.1bis — never trust the
 * client-side parse), filters `selectedIds` to those that survive re-parse
 * (R1.4.1ter), runs the phase 07 generator, then streams the bundle as a
 * `.zip` directly into the HTTP response.
 *
 * Nothing touches disk: the archiver runs in memory, the stream is piped to
 * `res`. After the request finishes the bundle is GC'd (R1.4.3, R1.4.6).
 */
import { Router, type RequestHandler, json } from 'express';
import { generateRequestSchema } from '@shared/config-schema';
import { ApiError, type ApiErrorPayload, type Endpoint } from '@shared/types';
import { parseSpec } from '../services/parser';
import { generateMcp } from '../services/mcp-generator';
import { buildZipStream } from '../services/zip-builder';

const BODY_LIMIT = '15mb';
const GENERATE_TIMEOUT_MS = 30_000;

export function createGenerateRouter(): Router {
  const router = Router();

  // Route-scoped body parser. The default app-level `express.json({ limit:
  // '10mb' })` would reject our larger payloads before this handler ever
  // runs, so we install a wider one here. Wrong-content-type errors fall
  // through harmlessly — `req.body` stays `undefined` and Zod catches it.
  router.use(json({ limit: BODY_LIMIT }));

  // Body parser surfaces `entity.too.large` via `next(err)`. Convert it to
  // our typed JSON envelope so the client sees a consistent shape.
  router.use(((err, _req, res, next) => {
    if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.too.large') {
      res.status(413).json(payload('PAYLOAD_TOO_LARGE', 'Spec is too large (max 15 MB).'));
      return;
    }
    next(err);
  }) as import('express').ErrorRequestHandler);

  router.post('/', handleGenerate);

  return router;
}

const handleGenerate: RequestHandler = async (req, res, next) => {
  // ─── 1. Schema check ────────────────────────────────────────────────────
  const parsed = generateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(payload('INVALID_SPEC', firstZodMessage(parsed.error)));
    return;
  }
  const body = parsed.data;

  try {
    // Wrap the whole pipeline in a single race so a hang anywhere (parser,
    // generator, archiver) trips the same 504. The wider 30s budget covers
    // generation + the time it takes the consumer to start pulling.
    await withTimeout(
      runGeneration(body, res),
      GENERATE_TIMEOUT_MS,
      () => new ApiError('TIMEOUT', 'Generation timed out.', 504)
    );
  } catch (err) {
    if (res.headersSent) {
      // Once we've started streaming we can't switch to JSON — destroy the
      // socket so the client sees a truncated download and surfaces the
      // error in its own catch.
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

async function runGeneration(body: ValidatedBody, res: import('express').Response): Promise<void> {
  // ─── 2. Re-parse (R1.4.1bis) ────────────────────────────────────────────
  let reparsed;
  try {
    reparsed = await parseSpec(body.rawSpec, { sizeBytes: Buffer.byteLength(body.rawSpec) });
  } catch {
    throw new ApiError('INVALID_SPEC', 'Failed to re-parse the spec.', 400);
  }

  // ─── 3. Whitelist selectedIds against the freshly-parsed endpoints ─────
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

  // ─── 4. Generate the bundle ────────────────────────────────────────────
  let files;
  try {
    files = generateMcp({
      parsedSpec: reparsed,
      rawSpec: body.rawSpec,
      selectedIds: validIds,
      config: body.config,
    });
  } catch {
    throw new ApiError('GENERATION_FAILED', 'Bundle generation failed.', 500);
  }

  // ─── 5. Stream the ZIP ─────────────────────────────────────────────────
  const filename = `${body.config.mcpName}.zip`;
  res.status(200);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  const stream = buildZipStream(files);
  await new Promise<void>((resolve, reject) => {
    stream.on('error', reject);
    res.on('error', reject);
    res.on('finish', resolve);
    stream.pipe(res);
  });
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

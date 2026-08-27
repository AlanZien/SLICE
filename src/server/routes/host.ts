/**
 * Pivot-4 — POST /api/host
 *
 * Re-validates and re-parses the spec (same hardening as /api/generate —
 * never trust the client parse), distills the selection into a HostedMcpConfig,
 * stores it under an unguessable id, and returns `{ id, url }`. The hosted
 * runtime (`/m/:id`) then serves it on demand. No secret is stored.
 */
import { Router, type RequestHandler, json } from 'express';
import { generateRequestSchema } from '@shared/config-schema';
import { ApiError, type ApiErrorPayload, type SliceConfig } from '@shared/types';
import { reparseAndSelect } from '../services/reparse-and-select';
import { specToHostedConfig } from '../services/spec-to-hosted-config';
import { hostedStore } from '../services/hosted-store';
import { assertPublicUrl, SsrfError } from '../services/ssrf-guard';
import { defaultTtlHours } from './hosted-mcp';

const BODY_LIMIT = '15mb';

export interface HostRouterOptions {
  /** When false (production default), SSRF-guard the user-supplied baseUrl. */
  allowPrivateHosts?: boolean;
  /** Free-tier TTL in hours; 0 disables expiry. Defaults to SLICE_HOSTED_TTL_HOURS or 72. */
  ttlHours?: number;
}

export function createHostRouter(options: HostRouterOptions = {}): Router {
  const router = Router();
  router.use(json({ limit: BODY_LIMIT }));
  router.use(((err, _req, res, next) => {
    if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.too.large') {
      res.status(413).json(payload('PAYLOAD_TOO_LARGE', 'Spec is too large (max 15 MB).'));
      return;
    }
    next(err);
  }) as import('express').ErrorRequestHandler);
  router.post('/', makeHandleHost(options.allowPrivateHosts ?? false, options.ttlHours ?? defaultTtlHours()));
  return router;
}

const makeHandleHost = (allowPrivateHosts: boolean, ttlHours: number): RequestHandler => async (req, res, next) => {
  const parsed = generateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(payload('INVALID_SPEC', firstZodMessage(parsed.error)));
    return;
  }
  const body = parsed.data;

  try {
    // Re-parse server-side + whitelist the selection (never trust the client
    // parse) — shared with /api/generate.
    const { reparsed, validIds } = await reparseAndSelect(body.rawSpec, body.selectedIds, 'host');

    const config = specToHostedConfig(reparsed, validIds, body.config as SliceConfig);

    // SSRF guard: the hosted runtime will fetch `config.baseUrl` from SLICE's
    // own network. Reject loopback/private/link-local/metadata hosts up front
    // so we never store a config that could be used as an open proxy.
    if (!allowPrivateHosts) {
      try {
        await assertPublicUrl(config.baseUrl);
      } catch (err) {
        if (err instanceof SsrfError) {
          throw new ApiError('BLOCKED_HOST', 'The API base URL points to a non-public host.', 400);
        }
        throw err;
      }
    }

    const id = hostedStore.put(config);
    const url = `${req.protocol}://${req.get('host')}/m/${id}`;
    const createdAt = hostedStore.get(id)?.createdAt;
    const expiresAt =
      ttlHours > 0 && createdAt
        ? new Date(Date.parse(createdAt) + ttlHours * 3_600_000).toISOString()
        : null;
    res.status(200).json({ id, url, expiresAt });
  } catch (err) {
    if (err instanceof ApiError) {
      res.status(err.status).json(payload(err.code, err.message));
      return;
    }
    next(err);
  }
};

function payload(code: ApiErrorPayload['code'], message: string): ApiErrorPayload {
  return { code, message };
}

function firstZodMessage(err: import('zod').ZodError): string {
  const issue = err.issues[0];
  if (!issue) return 'Invalid request body.';
  const path = issue.path.length ? `${issue.path.join('.')}: ` : '';
  return `${path}${issue.message}`;
}

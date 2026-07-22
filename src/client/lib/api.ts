import type { ApiErrorCode, GenerateRequest, ParsedSpec, ParseErrorCode } from '@shared/types';

export interface ApiErrorBody {
  code: ParseErrorCode | ApiErrorCode | 'NO_FILE' | 'UNSUPPORTED_FORMAT' | string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorBody['code'],
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Translate a non-OK `Response` into a thrown `ApiError`. Prefers the server's
 * JSON `{ code, message }`; falls back to a generic message when the body is
 * absent or not JSON (e.g. an HTML 500 page, or empty statusText under HTTP/2)
 * so the UI never shows a blank error. Always throws — never returns.
 */
async function throwApiError(res: Response, fallbackCode: ApiErrorBody['code']): Promise<never> {
  let body: ApiErrorBody = {
    code: fallbackCode,
    message: res.statusText || `Erreur ${res.status} du serveur.`,
  };
  try {
    const parsed = (await res.json()) as ApiErrorBody;
    if (parsed && typeof parsed.message === 'string' && parsed.message.length > 0) {
      body = parsed;
    }
  } catch {
    // Server returned non-JSON — keep the fallback message.
  }
  throw new ApiError(res.status, body.code, body.message);
}

/**
 * Uploads a spec file to POST /api/upload and returns the parsed spec.
 * Throws ApiError with the typed code if the server rejects the file.
 */
export async function uploadSpec(file: File): Promise<ParsedSpec> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: form,
  });

  if (!res.ok) await throwApiError(res, 'INVALID_SPEC');

  return (await res.json()) as ParsedSpec;
}

export async function uploadSpecFromUrl(url: string): Promise<{ spec: ParsedSpec; rawSpec: string }> {
  const res = await fetch('/api/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) await throwApiError(res, 'URL_FETCH_FAILED');
  const { parsed, raw } = (await res.json()) as { parsed: ParsedSpec; raw: string };
  return { spec: parsed, rawSpec: raw };
}

export interface GenerateResult {
  blob: Blob;
  filename: string;
}

/**
 * Calls POST /api/generate with a fully-formed request and returns the
 * downloaded ZIP as a Blob, together with a filename derived from the
 * server's Content-Disposition header (falls back to `<mcpName>.zip`).
 *
 * The server streams the archive — `res.blob()` materialises it in memory
 * after the stream finishes, which is fine for the bundles we produce
 * (typically a few hundred KB).
 */
export async function apiGenerate(req: GenerateRequest): Promise<GenerateResult> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) await throwApiError(res, 'GENERATION_FAILED');

  const filename =
    parseFilename(res.headers.get('Content-Disposition')) ?? `${req.config.mcpName}.zip`;
  return { blob: await res.blob(), filename };
}

export interface HostResult {
  /** Unguessable id under which the hosted MCP config is stored. */
  id: string;
  /** Public URL of the hosted MCP (`<origin>/m/<id>`) to paste into the agent. */
  url: string;
  /** Free-tier expiry (ISO), or `null` when the instance has no TTL. */
  expiresAt: string | null;
}

/**
 * Calls POST /api/host with a fully-formed request. The server re-parses the
 * spec, distills the selection into a hosted config, stores it under an
 * unguessable id and returns `{ id, url }`. No secret is ever stored — the
 * caller's token is relayed at runtime by `/m/:id`.
 */
export async function apiHost(req: GenerateRequest): Promise<HostResult> {
  const res = await fetch('/api/host', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) await throwApiError(res, 'GENERATION_FAILED');

  return (await res.json()) as HostResult;
}

/** Extract `filename="<value>"` from a Content-Disposition header. */
function parseFilename(header: string | null): string | undefined {
  if (!header) return undefined;
  const match = /filename="([^"]+)"/.exec(header);
  return match?.[1];
}

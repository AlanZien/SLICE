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

  if (!res.ok) {
    // statusText is empty under HTTP/2 — fall back to a generic message so
    // the UI never shows a blank red box.
    let body: ApiErrorBody = {
      code: 'INVALID_SPEC',
      message: res.statusText || `Erreur ${res.status} du serveur.`,
    };
    try {
      const parsed = (await res.json()) as ApiErrorBody;
      if (parsed && typeof parsed.message === 'string' && parsed.message.length > 0) {
        body = parsed;
      }
    } catch {
      // Server didn't return JSON — keep the fallback message.
    }
    throw new ApiError(res.status, body.code, body.message);
  }

  return (await res.json()) as ParsedSpec;
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

  if (!res.ok) {
    let body: ApiErrorBody = {
      code: 'GENERATION_FAILED',
      message: res.statusText || `Erreur ${res.status} du serveur.`,
    };
    try {
      const parsed = (await res.json()) as ApiErrorBody;
      if (parsed && typeof parsed.message === 'string' && parsed.message.length > 0) {
        body = parsed;
      }
    } catch {
      // Server returned non-JSON (e.g. HTML 500 page) — keep the fallback.
    }
    throw new ApiError(res.status, body.code, body.message);
  }

  const filename =
    parseFilename(res.headers.get('Content-Disposition')) ?? `${req.config.mcpName}.zip`;
  return { blob: await res.blob(), filename };
}

/** Extract `filename="<value>"` from a Content-Disposition header. */
function parseFilename(header: string | null): string | undefined {
  if (!header) return undefined;
  const match = /filename="([^"]+)"/.exec(header);
  return match?.[1];
}

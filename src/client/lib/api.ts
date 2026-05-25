import type { ParsedSpec, ParseErrorCode } from '@shared/types';

export interface ApiErrorBody {
  code: ParseErrorCode | 'NO_FILE' | 'UNSUPPORTED_FORMAT' | string;
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
    let body: ApiErrorBody = { code: 'INVALID_SPEC', message: res.statusText };
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      // Server didn't return JSON — keep the fallback message.
    }
    throw new ApiError(res.status, body.code, body.message);
  }

  return (await res.json()) as ParsedSpec;
}

import { MAX_SPEC_BYTES } from '@shared/types';
import { assertPublicUrl, SsrfError } from './ssrf-guard';

export type UrlErrorCode =
  | 'URL_INVALID'
  | 'URL_FETCH_FAILED'
  | 'URL_PRIVATE_IP_BLOCKED'
  | 'URL_TIMEOUT'
  | 'URL_TOO_LARGE';

export class UrlFetchError extends Error {
  constructor(public readonly code: UrlErrorCode, message: string) {
    super(message);
    this.name = 'UrlFetchError';
  }
}

const FETCH_TIMEOUT_MS = 5_000;
const MAX_REDIRECTS = 3;
const USER_AGENT = 'SLICE/1.0';

async function fetchWithRedirects(url: string, signal: AbortSignal, hops = 0): Promise<Response> {
  if (hops > MAX_REDIRECTS) {
    throw new UrlFetchError('URL_FETCH_FAILED', `Too many redirects (max ${MAX_REDIRECTS}).`);
  }

  const res = await fetch(url, {
    redirect: 'manual',
    signal,
    headers: { 'User-Agent': USER_AGENT },
  });

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location');
    if (!location) throw new UrlFetchError('URL_FETCH_FAILED', 'Redirect with no Location header.');
    const next = new URL(location, url).href;
    try {
      await assertPublicUrl(next);
    } catch (err) {
      if (err instanceof SsrfError) throw new UrlFetchError('URL_PRIVATE_IP_BLOCKED', err.message);
      throw err;
    }
    return fetchWithRedirects(next, signal, hops + 1);
  }

  return res;
}

/**
 * Fetch a spec from a public HTTPS URL. SSRF-safe: validates the URL,
 * blocks private IPs, follows up to 3 redirects (each re-checked), and
 * enforces a 5s timeout and 10 MB body limit.
 */
export async function fetchSpecFromUrl(rawUrl: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UrlFetchError('URL_INVALID', 'Invalid URL.');
  }

  if (url.protocol !== 'https:') {
    throw new UrlFetchError('URL_INVALID', 'Only https:// URLs are allowed.');
  }

  try {
    await assertPublicUrl(rawUrl);
  } catch (err) {
    if (err instanceof SsrfError) throw new UrlFetchError('URL_PRIVATE_IP_BLOCKED', err.message);
    throw err;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetchWithRedirects(rawUrl, controller.signal);
  } catch (err) {
    if (err instanceof UrlFetchError) throw err;
    const isAbort = err instanceof Error && err.name === 'AbortError';
    throw new UrlFetchError(isAbort ? 'URL_TIMEOUT' : 'URL_FETCH_FAILED', isAbort ? 'Request timed out after 5s.' : 'Failed to fetch the URL.');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new UrlFetchError('URL_FETCH_FAILED', `Server returned ${res.status}.`);
  }

  const contentLength = res.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_SPEC_BYTES) {
    throw new UrlFetchError('URL_TOO_LARGE', 'Response exceeds the 10 MB limit.');
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = res.body?.getReader();
  if (!reader) {
    return await res.text();
  }
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_SPEC_BYTES) {
      await reader.cancel();
      throw new UrlFetchError('URL_TOO_LARGE', 'Response exceeds the 10 MB limit.');
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(
    chunks.reduce((acc, chunk) => {
      const merged = new Uint8Array(acc.byteLength + chunk.byteLength);
      merged.set(acc);
      merged.set(chunk, acc.byteLength);
      return merged;
    }, new Uint8Array(0))
  );
}

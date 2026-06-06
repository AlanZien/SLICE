import { MAX_SPEC_BYTES } from '@shared/types';
import { assertPublicUrl, SsrfError } from './ssrf-guard';
import { extractSpecUrls, commonSpecPaths, extractInlineSpec } from './html-spec-finder';

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
const MAX_CANDIDATES = 10;
const USER_AGENT = 'SLICE/1.0';

async function fetchWithRedirects(url: string, signal: AbortSignal, hops = 0): Promise<Response> {
  if (hops > MAX_REDIRECTS) {
    throw new UrlFetchError('URL_FETCH_FAILED', `Too many redirects (max ${MAX_REDIRECTS}).`);
  }

  try {
    await assertPublicUrl(url);
  } catch (err) {
    if (err instanceof SsrfError) throw new UrlFetchError('URL_PRIVATE_IP_BLOCKED', err.message);
    throw err;
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
    return fetchWithRedirects(next, signal, hops + 1);
  }

  return res;
}

interface FetchRawResult {
  body: string;
  contentType: string;
}

async function fetchRaw(url: string): Promise<FetchRawResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetchWithRedirects(url, controller.signal);
  } catch (err) {
    if (err instanceof UrlFetchError) throw err;
    const isAbort = err instanceof Error && err.name === 'AbortError';
    const code = isAbort ? 'URL_TIMEOUT' : 'URL_FETCH_FAILED';
    const message = isAbort ? 'Request timed out after 5s.' : 'Failed to fetch the URL.';
    throw new UrlFetchError(code, message);
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
  let body: string;
  if (!reader) {
    body = await res.text();
  } else {
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
    body = Buffer.concat(chunks).toString('utf8');
  }

  return { body, contentType: res.headers.get('content-type') ?? '' };
}

function isHtmlLike(contentType: string): boolean {
  const type = contentType.split(';')[0].toLowerCase().trim();
  return type === 'text/html' || type === 'application/xhtml+xml';
}

async function resolveSpecFromHtml(html: string, pageUrl: string): Promise<string> {
  const inline = extractInlineSpec(html);
  if (inline) return inline;

  const candidates = [
    ...new Set([...extractSpecUrls(html, pageUrl), ...commonSpecPaths(pageUrl)]),
  ].slice(0, MAX_CANDIDATES);

  for (const candidateUrl of candidates) {
    try {
      const { body, contentType } = await fetchRaw(candidateUrl);
      if (!isHtmlLike(contentType)) return body;
    } catch (err) {
      if (err instanceof UrlFetchError && err.code === 'URL_PRIVATE_IP_BLOCKED') throw err;
      // network error or 404 — try next candidate
    }
  }

  // Last resort: the body itself may be a valid spec served with the wrong
  // Content-Type (e.g. S3/nginx misconfigured as text/html). Hand it to the
  // parser — it will reject it with INVALID_SPEC if it truly isn't a spec.
  return html;
}

/**
 * Fetch a spec from a public HTTPS URL. SSRF-safe: validates the URL,
 * blocks private IPs, follows up to 3 redirects (each re-checked), and
 * enforces a 5s timeout and 10 MB body limit.
 *
 * When the URL returns an HTML page, automatically searches for an embedded
 * or linked OpenAPI/Swagger spec (linked via <a>/<link>, inline in <script>,
 * or at common paths like /openapi.json).
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

  const { body, contentType } = await fetchRaw(rawUrl);

  if (isHtmlLike(contentType)) {
    return resolveSpecFromHtml(body, rawUrl);
  }

  return body;
}

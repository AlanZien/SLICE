import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchSpecFromUrl, UrlFetchError } from './url-fetcher';
import { SsrfError } from './ssrf-guard';

// Stub fetch globally for all tests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock assertPublicUrl so tests don't hit real DNS.
// Private-IP tests simulate SSRF by making assertPublicUrl throw SsrfError.
const mockAssertPublicUrl = vi.fn<(url: string) => Promise<void>>();
vi.mock('./ssrf-guard', async (importOriginal) => {
  const real = await importOriginal<typeof import('./ssrf-guard')>();
  return { ...real, assertPublicUrl: (...args: [string]) => mockAssertPublicUrl(...args) };
});

function okResponse(body: string, headers: Record<string, string> = {}): Response {
  return new Response(body, { status: 200, headers });
}

afterEach(() => {
  mockFetch.mockReset();
  mockAssertPublicUrl.mockReset();
  // Default: public URL — pass through
  mockAssertPublicUrl.mockResolvedValue(undefined);
});

describe('fetchSpecFromUrl', () => {
  it('rejects non-https URLs', async () => {
    await expect(fetchSpecFromUrl('http://api.example.com/spec.json')).rejects.toMatchObject({
      code: 'URL_INVALID',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects non-URL strings', async () => {
    await expect(fetchSpecFromUrl('not a url')).rejects.toMatchObject({ code: 'URL_INVALID' });
  });

  it('blocks private IP addresses', async () => {
    mockAssertPublicUrl.mockRejectedValueOnce(new SsrfError('Blocked non-public address: 127.0.0.1'));
    await expect(fetchSpecFromUrl('https://127.0.0.1/spec.json')).rejects.toMatchObject({
      code: 'URL_PRIVATE_IP_BLOCKED',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('blocks link-local addresses', async () => {
    mockAssertPublicUrl.mockRejectedValueOnce(new SsrfError('Blocked non-public address: 169.254.169.254'));
    await expect(fetchSpecFromUrl('https://169.254.169.254/latest/meta-data/')).rejects.toMatchObject({
      code: 'URL_PRIVATE_IP_BLOCKED',
    });
  });

  it('returns body on success', async () => {
    mockFetch.mockResolvedValueOnce(okResponse('{"openapi":"3.0.0"}'));
    const body = await fetchSpecFromUrl('https://api.example.com/spec.json');
    expect(body).toBe('{"openapi":"3.0.0"}');
  });

  it('sends SLICE/1.0 User-Agent', async () => {
    mockFetch.mockResolvedValueOnce(okResponse('spec'));
    await fetchSpecFromUrl('https://api.example.com/spec.json');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/spec.json',
      expect.objectContaining({ headers: expect.objectContaining({ 'User-Agent': 'SLICE/1.0' }) })
    );
  });

  it('throws URL_FETCH_FAILED on non-2xx response', async () => {
    mockFetch.mockResolvedValueOnce(new Response('Not found', { status: 404 }));
    await expect(fetchSpecFromUrl('https://api.example.com/spec.json')).rejects.toMatchObject({
      code: 'URL_FETCH_FAILED',
    });
  });

  it('throws URL_TOO_LARGE when Content-Length exceeds 10 MB', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('x', { status: 200, headers: { 'Content-Length': String(11 * 1024 * 1024) } })
    );
    await expect(fetchSpecFromUrl('https://api.example.com/spec.json')).rejects.toMatchObject({
      code: 'URL_TOO_LARGE',
    });
  });

  it('follows up to 3 redirects', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://api.example.com/v2' } }))
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: 'https://api.example.com/v3' } }))
      .mockResolvedValueOnce(okResponse('spec-v3'));
    const body = await fetchSpecFromUrl('https://api.example.com/spec.json');
    expect(body).toBe('spec-v3');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('throws URL_FETCH_FAILED after more than 3 redirects', async () => {
    const redirect = new Response(null, { status: 302, headers: { location: 'https://api.example.com/next' } });
    mockFetch.mockResolvedValue(redirect);
    await expect(fetchSpecFromUrl('https://api.example.com/spec.json')).rejects.toMatchObject({
      code: 'URL_FETCH_FAILED',
    });
  });

  it('blocks a redirect that points to a private IP', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(null, { status: 302, headers: { location: 'https://192.168.1.1/secret' } })
    );
    // First call (initial URL) passes, second call (redirect target) is blocked
    mockAssertPublicUrl
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new SsrfError('Blocked non-public address: 192.168.1.1'));
    await expect(fetchSpecFromUrl('https://api.example.com/spec.json')).rejects.toMatchObject({
      code: 'URL_PRIVATE_IP_BLOCKED',
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

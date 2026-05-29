import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiGenerate, apiGenerateBinary, ApiError } from './api';
import type { GenerateRequest, ParsedSpec, SliceConfig } from '@shared/types';

const FAKE_PARSED: ParsedSpec = {
  apiName: 'X',
  apiVersion: '1',
  baseUrl: '',
  authType: 'none',
  groups: [],
};

const FAKE_CONFIG: SliceConfig = {
  mcpName: 'demo',
  baseUrl: 'https://api.demo.test',
  upstreamAuth: { type: 'none' },
  mode: 'local',
  includeParamDescriptions: false,
  retryOnServerError: false,
};

const FAKE_REQ: GenerateRequest = {
  parsedSpec: FAKE_PARSED,
  rawSpec: 'openapi: "3.0.3"',
  selectedIds: ['GET /x'],
  config: FAKE_CONFIG,
};

describe('apiGenerate', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns { blob, filename } on 200 with Content-Disposition', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response('ZIP CONTENT', {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="demo.zip"',
        },
      })
    ) as typeof fetch;

    const out = await apiGenerate(FAKE_REQ);
    expect(out.filename).toBe('demo.zip');
    expect(out.blob.size).toBeGreaterThan(0);
  });

  it('throws ApiError with typed code on 4xx JSON error', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ code: 'NO_ENDPOINT_SELECTED', message: 'pick one' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as typeof fetch;

    await expect(apiGenerate(FAKE_REQ)).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      code: 'NO_ENDPOINT_SELECTED',
    });
  });

  it('falls back to a sane filename when Content-Disposition is missing', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response('x', {
        status: 200,
        headers: { 'Content-Type': 'application/zip' },
      })
    ) as typeof fetch;

    const out = await apiGenerate(FAKE_REQ);
    expect(out.filename).toBe('demo.zip'); // derived from config.mcpName
  });

  it('throws a generic ApiError on non-JSON error bodies', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response('<html>500</html>', {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      })
    ) as typeof fetch;

    await expect(apiGenerate(FAKE_REQ)).rejects.toBeInstanceOf(ApiError);
  });
});

describe('apiGenerateBinary', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('POSTs to /api/generate-binary with the target query string', async () => {
    const spy: ReturnType<typeof vi.fn> = vi.fn(async () =>
      new Response('BIN', {
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment; filename="demo-macos-arm64"',
        },
      })
    );
    globalThis.fetch = spy as unknown as typeof fetch;

    const out = await apiGenerateBinary(FAKE_REQ, 'macos-arm64');
    expect(out.filename).toBe('demo-macos-arm64');
    expect(out.blob.size).toBeGreaterThan(0);

    const firstCall = spy.mock.calls[0] as [string | URL, RequestInit];
    expect(String(firstCall[0])).toBe('/api/generate-binary?target=macos-arm64');
    expect(firstCall[1].method).toBe('POST');
  });

  it('falls back to <mcpName>-<target> when Content-Disposition is missing', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response('BIN', {
        status: 200,
        headers: { 'Content-Type': 'application/octet-stream' },
      })
    ) as typeof fetch;

    const out = await apiGenerateBinary(FAKE_REQ, 'windows-x64');
    expect(out.filename).toBe('demo-windows-x64.exe');
  });

  it('throws ApiError with typed code on 4xx', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ code: 'INVALID_TARGET', message: 'nope' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as typeof fetch;

    await expect(apiGenerateBinary(FAKE_REQ, 'macos-arm64')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      code: 'INVALID_TARGET',
    });
  });
});

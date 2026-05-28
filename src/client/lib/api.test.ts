import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiGenerate, ApiError } from './api';
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
    const fakeBlob = new Blob(['ZIP CONTENT'], { type: 'application/zip' });
    globalThis.fetch = vi.fn(async () =>
      new Response(fakeBlob, {
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
      new Response(new Blob(['x']), {
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

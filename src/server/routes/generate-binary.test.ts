import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { execSync } from 'node:child_process';
import { createApp } from '../app';
import type { GenerateRequest, ParsedSpec, SliceConfig } from '@shared/types';

/**
 * Phase 11 — POST /api/generate-binary
 *
 * Mirrors generate.test.ts but exercises the compile pipeline instead of the
 * ZIP one. The Bun toolchain is heavy (~150 ms warm, several seconds cold),
 * so we install the same loud-fail guard as binary-builder.test.ts and bump
 * the per-test budget — flaky cold caches must NOT masquerade as a server
 * regression.
 */
beforeAll(() => {
  try {
    const v = execSync('bun --version', { stdio: 'pipe' }).toString().trim();
    // eslint-disable-next-line no-console
    console.log(`[generate-binary.test] Bun ${v} detected`);
  } catch (err) {
    throw new Error(
      `Bun must be installed and on PATH to run generate-binary tests. ` +
        `Original error: ${err instanceof Error ? err.message : String(err)}`
    );
  }
});

const RAW_SPEC = `openapi: "3.0.3"
info: { title: "Demo", version: "1.0" }
servers: [{ url: "https://api.demo.test" }]
paths:
  /things:
    get:
      summary: List things
      operationId: listThings
      responses: { "200": { description: ok } }
`;

const PARSED_SPEC: ParsedSpec = {
  apiName: 'Demo',
  apiVersion: '1.0',
  baseUrl: 'https://api.demo.test',
  authType: 'none',
  groups: [
    {
      tag: 'default',
      endpoints: [
        {
          id: 'GET /things',
          method: 'GET',
          path: '/things',
          label: 'List things',
          params: [],
        },
      ],
    },
  ],
};

const VALID_CONFIG: SliceConfig = {
  mcpName: 'demo-mcp',
  baseUrl: 'https://api.demo.test',
  upstreamAuth: { type: 'none' },
  mode: 'local',
  includeParamDescriptions: false,
  retryOnServerError: false,
};

function buildBody(over: Partial<GenerateRequest> = {}): GenerateRequest {
  return {
    parsedSpec: PARSED_SPEC,
    rawSpec: RAW_SPEC,
    selectedIds: ['GET /things'],
    config: VALID_CONFIG,
    ...over,
  };
}

function postBinary(app: ReturnType<typeof createApp>, target: string, body: GenerateRequest) {
  return request(app)
    .post(`/api/generate-binary?target=${target}`)
    .send(body as unknown as object)
    .buffer(true)
    .parse((response, cb) => {
      const chunks: Buffer[] = [];
      response.on('data', (c: Buffer) => chunks.push(c));
      response.on('end', () => cb(null, Buffer.concat(chunks)));
    });
}

describe('POST /api/generate-binary', () => {
  const app = createApp({ nodeEnv: 'test' });

  it('returns 400 INVALID_TARGET when target query is missing', async () => {
    const res = await request(app)
      .post('/api/generate-binary')
      .send(buildBody());
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_TARGET');
  });

  it('returns 400 INVALID_TARGET for an unsupported target value', async () => {
    const res = await request(app)
      .post('/api/generate-binary?target=plan9')
      .send(buildBody());
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_TARGET');
  });

  it('returns 400 INVALID_SPEC when the body fails Zod validation', async () => {
    const res = await request(app)
      .post('/api/generate-binary?target=macos-arm64')
      .send({ parsedSpec: 'not an object', selectedIds: [], config: {} });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_SPEC');
  });

  it(
    'returns 200 + Mach-O bytes + filename without extension for macos-arm64',
    async () => {
      const res = await postBinary(app, 'macos-arm64', buildBody());
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/octet-stream/);
      expect(res.headers['content-disposition']).toMatch(
        /filename="demo-mcp-macos-arm64"/
      );
      const buf = res.body as Buffer;
      expect(buf.length).toBeGreaterThan(10 * 1024 * 1024);
      // Mach-O 64-bit arm64: cf fa ed fe
      expect(buf[0]).toBe(0xcf);
      expect(buf[1]).toBe(0xfa);
      expect(buf[2]).toBe(0xed);
      expect(buf[3]).toBe(0xfe);
    },
    120_000
  );

  it(
    'returns 200 + PE32+ bytes + .exe filename for windows-x64',
    async () => {
      const res = await postBinary(app, 'windows-x64', buildBody());
      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toMatch(
        /filename="demo-mcp-windows-x64\.exe"/
      );
      const buf = res.body as Buffer;
      expect(buf[0]).toBe(0x4d); // M
      expect(buf[1]).toBe(0x5a); // Z
    },
    180_000
  );

  it('returns 413 PAYLOAD_TOO_LARGE on bodies above the 15 MB cap', async () => {
    const huge = 'x'.repeat(16 * 1024 * 1024);
    const res = await request(app)
      .post('/api/generate-binary?target=macos-arm64')
      .set('Content-Type', 'application/json')
      .send(`{"junk":"${huge}"}`);
    expect(res.status).toBe(413);
    expect(res.body.code).toBe('PAYLOAD_TOO_LARGE');
  }, 20_000);
});

// Keep vi referenced so the import survives unused-import sweeps; a future
// test will mock buildBinary to assert timeout handling without paying the
// real Bun cost.
void vi;

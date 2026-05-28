import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import yauzl from 'yauzl';
import { createApp } from '../app';
import type { GenerateRequest, ParsedSpec, SliceConfig } from '@shared/types';

/**
 * The route receives an already-parsed spec (the client uploaded + parsed
 * in phase 02). For tests, we build a minimal but realistic `ParsedSpec`
 * carrying the raw OpenAPI source string so the server can re-parse it
 * (R1.4.1bis).
 */
const RAW_SPEC = `openapi: "3.0.3"
info: { title: "Demo", version: "1.0" }
servers: [{ url: "https://api.demo.test" }]
paths:
  /things:
    get:
      summary: List things
      operationId: listThings
      responses: { "200": { description: ok } }
  /things/{id}:
    get:
      summary: Get a thing
      operationId: getThing
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
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
        {
          id: 'GET /things/{id}',
          method: 'GET',
          path: '/things/{id}',
          label: 'Get a thing',
          params: [{ name: 'id', in: 'path', type: 'string', required: true }],
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

function unzipNames(buf: Buffer): Promise<string[]> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buf, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) return reject(err ?? new Error('no zip'));
      const names: string[] = [];
      zip.on('entry', (e) => {
        names.push(e.fileName);
        zip.readEntry();
      });
      zip.on('end', () => resolve(names));
      zip.on('error', reject);
      zip.readEntry();
    });
  });
}

describe('POST /api/generate', () => {
  const app = createApp({ nodeEnv: 'test' });

  it('returns 200 + Content-Disposition with the configured mcpName', async () => {
    const res = await request(app)
      .post('/api/generate')
      .send(buildBody())
      .buffer(true)
      .parse((response, cb) => {
        const chunks: Buffer[] = [];
        response.on('data', (c) => chunks.push(c));
        response.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/zip/);
    expect(res.headers['content-disposition']).toMatch(/filename="demo-mcp\.zip"/);
    const names = await unzipNames(res.body as Buffer);
    expect(names).toContain('package.json');
    expect(names).toContain('src/tools.ts');
  });

  it('returns 400 INVALID_SPEC when the body fails Zod validation', async () => {
    const res = await request(app)
      .post('/api/generate')
      .send({ parsedSpec: 'not an object', selectedIds: [], config: {} });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_SPEC');
  });

  it('returns 400 NO_ENDPOINT_SELECTED when no selected id survives re-parsing', async () => {
    const res = await request(app)
      .post('/api/generate')
      .send(buildBody({ selectedIds: ['GET /nonexistent'] }));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NO_ENDPOINT_SELECTED');
  });

  it('ignores unknown ids but keeps the valid ones (whitelist)', async () => {
    const res = await request(app)
      .post('/api/generate')
      .send(buildBody({ selectedIds: ['GET /things', 'GET /ghost', 'POST /missing'] }))
      .buffer(true)
      .parse((response, cb) => {
        const chunks: Buffer[] = [];
        response.on('data', (c) => chunks.push(c));
        response.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
  });

  it('returns 400 INVALID_SPEC when re-parsing the rawSpec fails', async () => {
    const res = await request(app)
      .post('/api/generate')
      .send(buildBody({ rawSpec: 'totally not openapi at all' }));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_SPEC');
  });

  it('returns 413 PAYLOAD_TOO_LARGE on bodies above the 15 MB cap', async () => {
    // 16 MB blob — body parser rejects before route handler runs.
    const huge = 'x'.repeat(16 * 1024 * 1024);
    const res = await request(app)
      .post('/api/generate')
      .set('Content-Type', 'application/json')
      .send(`{"junk":"${huge}"}`);
    expect(res.status).toBe(413);
    expect(res.body.code).toBe('PAYLOAD_TOO_LARGE');
  }, 20_000);
});

// Keep `readFileSync` used so vitest doesn't shake it out of the import graph
// — convenient hook for future fixtures.
void readFileSync;

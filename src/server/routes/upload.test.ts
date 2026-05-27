import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

const VALID_YAML = `openapi: "3.0.3"
info:
  title: Demo
  version: "1.0"
servers:
  - url: https://api.demo.test
paths:
  /things:
    get:
      tags: [Things]
      summary: list things
      responses:
        "200": { description: ok }
`;

function uploadFile(buffer: Buffer, filename: string, field: 'file' | 'spec' = 'file') {
  const app = createApp({ nodeEnv: 'test' });
  return request(app).post('/api/upload').attach(field, buffer, filename);
}

describe('POST /api/upload', () => {
  it('returns 200 + ParsedSpec on a valid OpenAPI 3.x YAML', async () => {
    const res = await uploadFile(Buffer.from(VALID_YAML), 'demo.yaml');
    expect(res.status).toBe(200);
    expect(res.body.apiName).toBe('Demo');
    expect(res.body.groups[0].endpoints[0].label).toBe('list things');
  });

  it('returns 200 on .json extension', async () => {
    const json = Buffer.from(
      JSON.stringify({
        openapi: '3.0.3',
        info: { title: 'JSON Demo', version: '1' },
        paths: {
          '/x': {
            get: { tags: ['x'], summary: 'g', responses: { '200': { description: 'ok' } } },
          },
        },
      })
    );
    const res = await uploadFile(json, 'demo.json');
    expect(res.status).toBe(200);
    expect(res.body.apiName).toBe('JSON Demo');
  });

  it('returns 415 on unsupported extension (.txt)', async () => {
    const res = await uploadFile(Buffer.from(VALID_YAML), 'demo.txt');
    expect(res.status).toBe(415);
    expect(res.body.code).toBe('UNSUPPORTED_FORMAT');
  });

  it('returns 413 on payloads larger than 10 MB', async () => {
    const big = Buffer.alloc(11 * 1024 * 1024, 'x');
    const res = await uploadFile(big, 'big.yaml');
    expect(res.status).toBe(413);
    expect(res.body.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('returns 400 INVALID_SPEC on empty content (nothing to translate)', async () => {
    const res = await uploadFile(Buffer.from('   \n  '), 'empty.yaml');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_SPEC');
  });

  it('returns 415 UNSUPPORTED_FORMAT on parseable but unknown content (e.g. random YAML)', async () => {
    const res = await uploadFile(Buffer.from('foo: { not: openapi }'), 'random.yaml');
    expect(res.status).toBe(415);
    expect(res.body.code).toBe('UNSUPPORTED_FORMAT');
  });

  it('returns 400 EMPTY_SPEC when the spec has no paths', async () => {
    const empty = `openapi: "3.0.0"
info: { title: empty, version: "1" }
paths: {}
`;
    const res = await uploadFile(Buffer.from(empty), 'empty.yaml');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('EMPTY_SPEC');
  });

  it('returns 200 on Swagger 2.0 via auto-conversion (phase 03)', async () => {
    const petstore = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../../../fixtures/petstore-swagger2.json'),
      'utf-8'
    );
    const res = await uploadFile(Buffer.from(petstore), 'petstore.json');
    expect(res.status).toBe(200);
    expect(res.body.apiName).toBe('Petstore (Swagger 2.0)');
    expect(res.body.groups.length).toBeGreaterThan(0);
  });

  it('returns 200 on Postman Collection v2 via auto-conversion (phase 03)', async () => {
    const postman = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../../../fixtures/shopify-postman-v2.json'),
      'utf-8'
    );
    const res = await uploadFile(Buffer.from(postman), 'shopify.json');
    expect(res.status).toBe(200);
    expect(res.body.apiName).toMatch(/shopify/i);
  });

  it('returns 415 UNSUPPORTED_FORMAT on GraphQL SDL renamed .yaml (phase 03)', async () => {
    const graphql = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../../../fixtures/graphql-sdl.txt'),
      'utf-8'
    );
    const res = await uploadFile(Buffer.from(graphql), 'schema.yaml');
    expect(res.status).toBe(415);
    expect(res.body.code).toBe('UNSUPPORTED_FORMAT');
  });

  it('returns 400 when no file is provided', async () => {
    const app = createApp({ nodeEnv: 'test' });
    const res = await request(app).post('/api/upload');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NO_FILE');
  });
});

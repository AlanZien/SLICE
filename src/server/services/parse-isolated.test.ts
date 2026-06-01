// T3 — parseSpecIsolated: runs the parser in a child_process so a pathological
// spec can't crash the server. Integration (spawns processes) — kept fast by
// using a short timeout (the kill is the primary guard, not the slow OOM).
import { describe, it, expect } from 'vitest';
import { parseSpec } from './parser';
import { parseSpecIsolated, classifyExit } from './parse-isolated';
import { refBomb } from './_fixtures/ref-bomb';

const trivial = JSON.stringify({
  openapi: '3.0.3',
  info: { title: 'ok', version: '1' },
  paths: { '/y': { get: { summary: 'y', responses: { '200': { description: 'ok' } } } } },
});

const rich = JSON.stringify({
  openapi: '3.0.3',
  info: { title: 'Rich', version: '2' },
  servers: [{ url: 'https://api.rich.test' }],
  components: { securitySchemes: { b: { type: 'http', scheme: 'bearer' } } },
  security: [{ b: [] }],
  paths: {
    '/items/{id}': {
      post: {
        summary: 'Create item under id',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'verbose', in: 'query', schema: { type: 'boolean' } },
          { name: 'X-Trace', in: 'header', schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', properties: { name: { type: 'string' }, meta: { type: 'object' } }, required: ['name'] },
            },
          },
        },
        responses: { '200': { description: 'ok' } },
      },
    },
  },
});

const oauthSpec = JSON.stringify({
  openapi: '3.0.3',
  info: { title: 'O', version: '1' },
  components: { securitySchemes: { o: { type: 'oauth2', flows: {} } } },
  security: [{ o: [] }],
  paths: { '/z': { get: { summary: 'z', responses: { '200': { description: 'ok' } } } } },
});

describe('classifyExit', () => {
  it('timeout → PARSE_TIMEOUT, otherwise → PARSE_TOO_COMPLEX', () => {
    expect(classifyExit(true)).toBe('PARSE_TIMEOUT');
    expect(classifyExit(false)).toBe('PARSE_TOO_COMPLEX');
  });
});

describe('parseSpecIsolated', () => {
  it('smoke: parses a trivial spec in a child process (Vitest spawn works)', async () => {
    const parsed = await parseSpecIsolated(trivial, { sizeBytes: Buffer.byteLength(trivial) });
    expect(parsed.groups.flatMap((g) => g.endpoints).map((e) => e.id)).toContain('GET /y');
  }, 15_000);

  it('equivalence: same ParsedSpec as in-process on a rich spec (R-O2)', async () => {
    const isolated = await parseSpecIsolated(rich, { sizeBytes: Buffer.byteLength(rich) });
    const inProcess = await parseSpec(rich, { sizeBytes: Buffer.byteLength(rich) });
    // The default MCP server token is generated randomly per parse — neutralise
    // it so the comparison checks the structural fidelity of the round-trip.
    const strip = (s: typeof isolated) => ({
      ...s,
      defaultConfig: s.defaultConfig ? { ...s.defaultConfig, mcpServerToken: 'X' } : undefined,
    });
    expect(strip(isolated)).toEqual(strip(inProcess));
  }, 15_000);

  it('preserves a typed ParseError code across the boundary (R-O3)', async () => {
    await expect(parseSpecIsolated('::: not json/yaml :::', { sizeBytes: 20 })).rejects.toMatchObject({
      name: 'ParseError',
    });
  }, 15_000);

  it('preserves a non-trivial code (UNSUPPORTED_AUTH) round-trip (A-3)', async () => {
    await expect(
      parseSpecIsolated(oauthSpec, { sizeBytes: Buffer.byteLength(oauthSpec) })
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_AUTH' });
  }, 15_000);

  it('rejects oversized specs WITHOUT spawning (I-2)', async () => {
    await expect(parseSpecIsolated('x', { sizeBytes: 11 * 1024 * 1024 })).rejects.toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
    });
  });

  it('a pathological spec is killed on timeout → PARSE_TIMEOUT, and the parent survives (R-O1/R-O4)', async () => {
    const bomb = refBomb(12, 7);
    await expect(
      parseSpecIsolated(bomb, { sizeBytes: Buffer.byteLength(bomb), maxMemoryMb: 256, timeoutMs: 1500 })
    ).rejects.toMatchObject({ code: 'PARSE_TIMEOUT' });
    // Parent survived: a normal parse still works right after.
    const parsed = await parseSpecIsolated(trivial, { sizeBytes: Buffer.byteLength(trivial) });
    expect(parsed.groups.length).toBeGreaterThan(0);
  }, 20_000);
});

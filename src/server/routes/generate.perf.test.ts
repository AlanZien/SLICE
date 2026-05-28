import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import request from 'supertest';
import { createApp } from '../app';
import { parseSpec } from '../services/parser';
import type { GenerateRequest, SliceConfig } from '@shared/types';

const BASE_CONFIG: SliceConfig = {
  mcpName: 'perf-mcp',
  baseUrl: 'https://example.com',
  upstreamAuth: { type: 'none' },
  mode: 'local',
  includeParamDescriptions: false,
  retryOnServerError: false,
};

async function buildBody(rawSpec: string): Promise<GenerateRequest> {
  const parsedSpec = await parseSpec(rawSpec, { sizeBytes: rawSpec.length });
  const selectedIds = parsedSpec.groups.flatMap((g) => g.endpoints.map((e) => e.id));
  return { parsedSpec, rawSpec, selectedIds, config: BASE_CONFIG };
}

/**
 * Drain the supertest response body. Plain `await request(...)` only resolves
 * after the stream finishes, so wall-clock from `start` to `end` gives us a
 * realistic end-to-end latency (parse + generate + zip + download).
 */
async function timed(app: ReturnType<typeof createApp>, body: GenerateRequest): Promise<number> {
  const start = performance.now();
  await request(app)
    .post('/api/generate')
    .send(body)
    .buffer(true)
    .parse((response, cb) => {
      const chunks: Buffer[] = [];
      response.on('data', (c) => chunks.push(c));
      response.on('end', () => cb(null, Buffer.concat(chunks)));
    })
    .expect(200);
  return performance.now() - start;
}

describe('POST /api/generate — perf (R1.4.4)', () => {
  const app = createApp({ nodeEnv: 'test' });

  it('generates the shopify-50 bundle under the 5s p95 budget', async () => {
    const raw = readFileSync('fixtures/shopify-50.yaml', 'utf-8');
    const body = await buildBody(raw);
    // 3 warm runs to feed the cache and module resolver, then 5 measured.
    for (let i = 0; i < 3; i++) await timed(app, body);
    const samples: number[] = [];
    for (let i = 0; i < 5; i++) samples.push(await timed(app, body));
    samples.sort((a, b) => a - b);
    const p95 = samples[Math.floor(samples.length * 0.95)] ?? samples[samples.length - 1];
    expect(p95).toBeLessThan(5000);
  }, 60_000);

  it('generates the aws-500 bundle under the 10s p95 budget (volume tier)', async () => {
    const raw = readFileSync('fixtures/aws-500.yaml', 'utf-8');
    const body = await buildBody(raw);
    const samples: number[] = [];
    for (let i = 0; i < 3; i++) samples.push(await timed(app, body));
    samples.sort((a, b) => a - b);
    const p95 = samples[Math.floor(samples.length * 0.95)] ?? samples[samples.length - 1];
    expect(p95).toBeLessThan(10_000);
  }, 90_000);
});

describe('POST /api/generate — no persistence (R1.4.6)', () => {
  const app = createApp({ nodeEnv: 'test' });

  it('leaves no extra files in os.tmpdir() after a request', async () => {
    const raw = readFileSync('fixtures/shopify-50.yaml', 'utf-8');
    const body = await buildBody(raw);

    const before = new Set(readdirSync(tmpdir()));
    await timed(app, body);
    const after = new Set(readdirSync(tmpdir()));

    const added = [...after].filter(
      (name) => !before.has(name) && /slice|mcp|generate|zip|archive/i.test(name)
    );
    expect(added).toEqual([]);
  }, 30_000);
});

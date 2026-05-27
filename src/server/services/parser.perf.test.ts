import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseSpec } from './parser';

const FIXTURES = resolve(__dirname, '../../../fixtures');

function load(name: string): string {
  return readFileSync(resolve(FIXTURES, name), 'utf-8');
}

/**
 * Perf budget for parsing a real-sized API description.
 * SPEC R1.1.9 — p95 < 2s on a 50-endpoint Shopify-like fixture. We exercise
 * the same code path on the 500-endpoint AWS fixture too as a stress test.
 *
 * The test is deliberately not Vitest's `bench` runner — bench reports are
 * informational and don't fail the CI. We want a hard assertion that the
 * pipeline doesn't silently regress past the budget.
 */
async function timed<T>(fn: () => Promise<T>): Promise<number> {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

describe('parseSpec perf', () => {
  it('parses fixtures/shopify-50.yaml (50 endpoints) in under 2s (R1.1.9)', async () => {
    const raw = load('shopify-50.yaml');
    const elapsed = await timed(() =>
      parseSpec(raw, { sizeBytes: raw.length })
    );
    expect(elapsed).toBeLessThan(2000);
  }, 5000);

  it('parses fixtures/aws-500.yaml (500 endpoints) in under 3s', async () => {
    const raw = load('aws-500.yaml');
    const elapsed = await timed(() =>
      parseSpec(raw, { sizeBytes: raw.length })
    );
    // No explicit SPEC bound for 500 endpoints; we set 3s as a reasonable
    // ceiling — anything slower is a regression worth investigating.
    expect(elapsed).toBeLessThan(3000);
  }, 6000);
});

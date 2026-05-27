import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodingForModel } from 'js-tiktoken';

import { parseSpec } from './parser';
import { estimateSpecTokens } from '../../shared/token-estimator';
import type { Endpoint, ParsedSpec } from '../../shared/types';

/**
 * SPEC R1.2.8 — the heuristic must stay within ±15% of the real tiktoken
 * count on each of the four calibration fixtures. This test runs the
 * comparison in-process so a regression in the estimator (or in how
 * `parseSpec` shapes the data the estimator reads) fails CI.
 *
 * Coefficient tuning happens offline via `scripts/calibrate-tokens.ts`.
 * Here we only verify the frozen coefficients still hold.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(HERE, '../../../fixtures/calibration');
const TARGET_TOLERANCE = 0.15;

const enc = encodingForModel('gpt-4');

function renderEndpointForMcp(ep: Endpoint): string {
  const params = ep.params
    .map(
      (p) =>
        `  ${p.name}: z.${p.type === 'integer' || p.type === 'number' ? 'number()' : 'string()'}${p.required ? '' : '.optional()'}.describe(${JSON.stringify(p.description ?? '')}),`
    )
    .join('\n');
  return `server.tool(
  ${JSON.stringify(ep.id)},
  ${JSON.stringify((ep.description ?? ep.label).slice(0, 500))},
  {
${params}
  },
  async (input) => { /* call ${ep.method} ${ep.path} */ }
);`;
}

function realTokenCount(spec: ParsedSpec): number {
  let total = 0;
  for (const group of spec.groups) {
    for (const ep of group.endpoints) {
      total += enc.encode(renderEndpointForMcp(ep)).length;
    }
  }
  return total;
}

describe('token-estimator calibration (SPEC R1.2.8 ±15%)', () => {
  const fixtures = readdirSync(FIXTURES_DIR).filter((f: string) => /\.(yaml|json)$/.test(f));

  for (const filename of fixtures) {
    const name = filename.replace(/\.(yaml|json)$/, '');
    it(`stays within ±15% of tiktoken on ${name}`, async () => {
      const raw = readFileSync(resolve(FIXTURES_DIR, filename), 'utf-8');
      const spec = await parseSpec(raw, { sizeBytes: raw.length, timeoutMs: 30000 });
      const actual = realTokenCount(spec);
      const estimate = estimateSpecTokens(spec);
      const deviation = Math.abs(estimate - actual) / actual;
      expect(deviation).toBeLessThanOrEqual(TARGET_TOLERANCE);
    }, 10000);
  }
});

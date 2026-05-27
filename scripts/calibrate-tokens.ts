/**
 * Token estimator calibration script — phase 05.
 *
 * Goal: tune the coefficients of the token-estimation heuristic so that for
 * each calibration fixture, our estimate stays within ±15% of the real
 * tiktoken `cl100k_base` count.
 *
 * The "real" reference is the MCP tool declaration we'd ship for each
 * endpoint — name + description + Zod input schema as a string. We model it
 * here verbatim so the heuristic is calibrated against the actual artefact,
 * not against a synthetic surrogate.
 *
 * Usage:  pnpm tsx scripts/calibrate-tokens.ts
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import { encodingForModel } from 'js-tiktoken';

import { parseSpec } from '../src/server/services/parser.js';
import type { Endpoint, ParsedSpec } from '../src/shared/types.js';

const FIXTURES_DIR = resolve(import.meta.dirname, '../fixtures/calibration');
const TARGET_TOLERANCE = 0.15; // ±15% per SPEC R1.2.8

const enc = encodingForModel('gpt-4'); // cl100k_base

/**
 * Renders one endpoint as the text block we'd embed in the generated MCP
 * server (Zod tool declaration). Keeping this in one place ensures the
 * estimator is calibrated against the actual generated artefact.
 */
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

/**
 * Heuristic to tune. Coefficients live in this object so we can grid-search
 * them below. The SPEC formula was:
 *   tokens = 40 + 8 × params + ceil(description.length / 4)
 * We expose the coefficients and let the search find the optimal set.
 */
interface Coefficients {
  base: number;
  perParam: number;
  charsPerToken: number;
}

function estimateEndpoint(ep: Endpoint, c: Coefficients): number {
  const descLen = (ep.description ?? ep.label ?? '').length;
  return c.base + c.perParam * ep.params.length + Math.ceil(descLen / c.charsPerToken);
}

function estimateSpec(spec: ParsedSpec, c: Coefficients): number {
  let total = 0;
  for (const group of spec.groups) {
    for (const ep of group.endpoints) {
      total += estimateEndpoint(ep, c);
    }
  }
  return total;
}

async function loadFixture(filename: string): Promise<{ name: string; spec: ParsedSpec }> {
  const raw = readFileSync(resolve(FIXTURES_DIR, filename), 'utf-8');
  const spec = await parseSpec(raw, { sizeBytes: raw.length, timeoutMs: 30000 });
  return { name: filename.replace(/\.(yaml|json)$/, ''), spec };
}

function deviation(estimate: number, actual: number): number {
  return Math.abs(estimate - actual) / actual;
}

interface FixtureResult {
  name: string;
  actual: number;
  estimate: number;
  deviation: number;
}

function scoreCoefficients(coeffs: Coefficients, fixtures: Array<{ name: string; spec: ParsedSpec; actual: number }>): { worst: number; perFixture: FixtureResult[] } {
  const perFixture = fixtures.map((f) => {
    const est = estimateSpec(f.spec, coeffs);
    return { name: f.name, actual: f.actual, estimate: est, deviation: deviation(est, f.actual) };
  });
  const worst = Math.max(...perFixture.map((r) => r.deviation));
  return { worst, perFixture };
}

async function main(): Promise<void> {
  console.log('Loading calibration fixtures…');
  const fixtureNames = readdirSync(FIXTURES_DIR).filter((f) => /\.(yaml|json)$/.test(f));
  const fixtures = [];
  for (const f of fixtureNames) {
    const { name, spec } = await loadFixture(f);
    const actual = realTokenCount(spec);
    fixtures.push({ name, spec, actual });
    console.log(`  ${name}: ${actual} real tokens (${spec.groups.reduce((a, g) => a + g.endpoints.length, 0)} endpoints)`);
  }

  console.log('\nGrid-searching coefficients…');
  let best: { coeffs: Coefficients; worst: number; perFixture: FixtureResult[] } | null = null;
  for (let base = 20; base <= 80; base += 5) {
    for (let perParam = 0; perParam <= 20; perParam += 1) {
      for (let charsPerToken = 2; charsPerToken <= 6; charsPerToken += 0.25) {
        const coeffs = { base, perParam, charsPerToken };
        const score = scoreCoefficients(coeffs, fixtures);
        if (!best || score.worst < best.worst) {
          best = { coeffs, ...score };
        }
      }
    }
  }

  if (!best) throw new Error('No coefficients found');

  console.log('\nBest coefficients:');
  console.log(`  base = ${best.coeffs.base}`);
  console.log(`  perParam = ${best.coeffs.perParam}`);
  console.log(`  charsPerToken = ${best.coeffs.charsPerToken}`);

  console.log('\nPer-fixture deviation:');
  for (const f of best.perFixture) {
    const pct = (f.deviation * 100).toFixed(1);
    const sign = f.estimate >= f.actual ? '+' : '-';
    const flag = f.deviation <= TARGET_TOLERANCE ? '✓' : '✗';
    console.log(`  ${flag} ${f.name.padEnd(20)} actual=${String(f.actual).padStart(6)} estimate=${String(f.estimate).padStart(6)} dev=${sign}${pct}%`);
  }

  const pass = best.worst <= TARGET_TOLERANCE;
  console.log(`\nWorst deviation: ${(best.worst * 100).toFixed(1)}% — ${pass ? 'PASS' : 'FAIL'} (target ±${TARGET_TOLERANCE * 100}%)`);

  if (!pass) {
    console.error('\nCalibration failed. Consider escalating to a tiktoken-based backend endpoint.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

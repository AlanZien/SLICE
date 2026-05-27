import { describe, it, expect } from 'vitest';
import type { Endpoint, ParsedSpec } from './types';
import {
  estimateEndpointTokens,
  estimateSpecTokens,
  computeEconomy,
} from './token-estimator';

const ep = (over: Partial<Endpoint>): Endpoint => ({
  id: 'GET /x',
  method: 'GET',
  path: '/x',
  label: 'x',
  params: [],
  ...over,
});

const spec = (endpoints: Endpoint[]): ParsedSpec => ({
  apiName: 'T',
  apiVersion: '1',
  baseUrl: '',
  authType: 'none',
  groups: [{ tag: 'T', endpoints }],
});

describe('estimateEndpointTokens', () => {
  it('uses the base cost for a minimal endpoint with no params and no description', () => {
    expect(estimateEndpointTokens(ep({}))).toBe(25);
  });

  it('adds 20 tokens per parameter (calibrated coefficient)', () => {
    const e = ep({
      params: [
        { name: 'limit', in: 'query', required: false },
        { name: 'cursor', in: 'query', required: false },
      ],
    });
    expect(estimateEndpointTokens(e)).toBe(25 + 2 * 20);
  });

  it('counts the description at 1 token per 5 characters (calibrated)', () => {
    // 50-char description → ceil(50 / 5) = 10 tokens on top of the base.
    const e = ep({ description: 'a'.repeat(50) });
    expect(estimateEndpointTokens(e)).toBe(25 + 10);
  });

  it('falls back to the label length when description is missing', () => {
    const e = ep({ label: 'list things' });
    expect(estimateEndpointTokens(e)).toBe(25 + Math.ceil('list things'.length / 5));
  });
});

describe('estimateSpecTokens', () => {
  it('returns 0 for an empty spec', () => {
    expect(estimateSpecTokens(spec([]))).toBe(0);
  });

  it('sums the per-endpoint estimates', () => {
    const a = ep({ id: 'a' });
    const b = ep({ id: 'b', params: [{ name: 'q', in: 'query', required: false }] });
    expect(estimateSpecTokens(spec([a, b]))).toBe(
      estimateEndpointTokens(a) + estimateEndpointTokens(b)
    );
  });
});

describe('computeEconomy', () => {
  const endpoints = [
    ep({ id: 'GET /a' }),
    ep({ id: 'GET /b' }),
    ep({ id: 'GET /c' }),
    ep({ id: 'GET /d' }),
  ];
  const s = spec(endpoints);

  it('returns 0% savings when every endpoint is selected', () => {
    const result = computeEconomy(s, ['GET /a', 'GET /b', 'GET /c', 'GET /d']);
    expect(result.percent).toBe(0);
  });

  it('returns 100% savings when nothing is selected', () => {
    const result = computeEconomy(s, []);
    expect(result.percent).toBe(100);
  });

  it('returns 50% savings when half the endpoints are selected', () => {
    const result = computeEconomy(s, ['GET /a', 'GET /b']);
    expect(result.percent).toBe(50);
  });

  it('rounds the percentage to the nearest integer', () => {
    const small = spec([ep({ id: '1' }), ep({ id: '2' }), ep({ id: '3' })]);
    // 1 selected of 3 → 1/3 of tokens kept → ~67% saved
    const result = computeEconomy(small, ['1']);
    expect(result.percent).toBe(67);
    expect(Number.isInteger(result.percent)).toBe(true);
  });

  it('reports raw token counts alongside the percentage', () => {
    const result = computeEconomy(s, ['GET /a', 'GET /b']);
    expect(result.selected).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(result.selected);
  });

  it('returns 100% on an empty spec (degenerate but explicit)', () => {
    const result = computeEconomy(spec([]), []);
    expect(result.percent).toBe(100);
    expect(result.total).toBe(0);
  });

  it('ignores selected ids that do not exist in the spec', () => {
    const result = computeEconomy(s, ['GET /a', 'unknown']);
    // Same as selecting just `GET /a`.
    const expected = computeEconomy(s, ['GET /a']);
    expect(result.percent).toBe(expected.percent);
  });
});

import { describe, it, expect } from 'vitest';
import { hasRealBugs, type Verdict } from './corpus-check';

const v = (status: Verdict['status']): Verdict => ({ name: 'x', endpoints: 1, status });

describe('hasRealBugs (corpus-check gate)', () => {
  it('returns true when any verdict is a CRASH', () => {
    expect(hasRealBugs([v('ok'), v('reject'), v('CRASH')])).toBe(true);
  });

  it('returns true when any verdict is a zodfail', () => {
    expect(hasRealBugs([v('ok'), v('zodfail')])).toBe(true);
  });

  it('returns false for graceful outcomes (reject/toobig/fetcherr/ok)', () => {
    expect(hasRealBugs([v('ok'), v('reject'), v('toobig'), v('fetcherr')])).toBe(false);
  });

  it('returns false on an empty run', () => {
    expect(hasRealBugs([])).toBe(false);
  });
});

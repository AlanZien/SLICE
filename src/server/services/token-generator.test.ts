import { describe, it, expect } from 'vitest';
import { generateMcpServerToken } from './token-generator';

describe('generateMcpServerToken', () => {
  it('returns a 32-character string', () => {
    expect(generateMcpServerToken()).toHaveLength(32);
  });

  it('only contains lowercase hex digits', () => {
    expect(generateMcpServerToken()).toMatch(/^[a-f0-9]{32}$/);
  });

  it('produces a different value on each call (entropy sanity)', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateMcpServerToken()));
    expect(tokens.size).toBe(50);
  });
});

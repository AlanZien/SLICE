import { describe, it, expect } from 'vitest';
import { sliceConfigSchema, mcpNameSchema, baseUrlSchema } from './config-schema';

const valid = {
  mcpName: 'shopify-admin',
  baseUrl: 'https://api.shopify.com/v1',
  upstreamAuth: { type: 'apiKey', headerName: 'X-API-Key' },
  mode: 'both',
  mcpServerToken: 'a'.repeat(32),
  includeParamDescriptions: true,
  retryOnServerError: false,
} as const;

describe('mcpNameSchema', () => {
  it('accepts kebab-case names 3–40 chars long', () => {
    expect(mcpNameSchema.safeParse('shopify-admin').success).toBe(true);
    expect(mcpNameSchema.safeParse('abc').success).toBe(true);
    expect(mcpNameSchema.safeParse('a'.repeat(40)).success).toBe(true);
  });

  it('rejects uppercase, spaces, special chars', () => {
    expect(mcpNameSchema.safeParse('Shopify').success).toBe(false);
    expect(mcpNameSchema.safeParse('shopify admin').success).toBe(false);
    expect(mcpNameSchema.safeParse('shopify!').success).toBe(false);
  });

  it('rejects too short / too long', () => {
    expect(mcpNameSchema.safeParse('ab').success).toBe(false);
    expect(mcpNameSchema.safeParse('a'.repeat(41)).success).toBe(false);
  });
});

describe('baseUrlSchema', () => {
  it('accepts https URLs', () => {
    expect(baseUrlSchema.safeParse('https://api.shopify.com').success).toBe(true);
    expect(baseUrlSchema.safeParse('https://example.com/v1').success).toBe(true);
  });

  it('accepts http URLs (for local dev / private networks)', () => {
    expect(baseUrlSchema.safeParse('http://localhost:3001').success).toBe(true);
  });

  it('rejects garbage and non-http schemes', () => {
    expect(baseUrlSchema.safeParse('ftp://example.com').success).toBe(false);
    expect(baseUrlSchema.safeParse('not-a-url').success).toBe(false);
    expect(baseUrlSchema.safeParse('').success).toBe(false);
  });
});

describe('sliceConfigSchema', () => {
  it('accepts a fully valid config', () => {
    expect(sliceConfigSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects when mcpServerToken is missing for HTTP-exposing modes', () => {
    const noToken = { ...valid, mcpServerToken: undefined };
    expect(sliceConfigSchema.safeParse({ ...noToken, mode: 'remote' }).success).toBe(false);
    expect(sliceConfigSchema.safeParse({ ...noToken, mode: 'both' }).success).toBe(false);
  });

  it('allows missing mcpServerToken in local-only mode', () => {
    const local = { ...valid, mode: 'local', mcpServerToken: undefined };
    expect(sliceConfigSchema.safeParse(local).success).toBe(true);
  });

  it('rejects an mcpServerToken that is not 32 hex chars', () => {
    const bad = { ...valid, mcpServerToken: 'too-short' };
    expect(sliceConfigSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects apiKey auth without a headerName', () => {
    const bad = { ...valid, upstreamAuth: { type: 'apiKey' } };
    expect(sliceConfigSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects unsupported upstream auth types (oauth2, basic, digest)', () => {
    const oauth = { ...valid, upstreamAuth: { type: 'oauth2' } };
    expect(sliceConfigSchema.safeParse(oauth).success).toBe(false);
  });
});

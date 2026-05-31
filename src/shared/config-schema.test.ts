import { describe, it, expect } from 'vitest';
import { sliceConfigSchema, mcpNameSchema, baseUrlSchema } from './config-schema';

const valid = {
  mcpName: 'shopify-admin',
  baseUrl: 'https://api.shopify.com/v1',
  upstreamAuth: { type: 'apiKey', headerName: 'X-API-Key' },
  hosting: 'self',
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

  // Pivot RC1.2/RC1.3 — the hosting target is the screen-3 mandatory choice.
  it('requires a hosting target (cloud or self)', () => {
    expect(sliceConfigSchema.safeParse({ ...valid, hosting: undefined }).success).toBe(false);
    expect(sliceConfigSchema.safeParse({ ...valid, hosting: 'cloud' }).success).toBe(true);
    expect(sliceConfigSchema.safeParse({ ...valid, hosting: 'self' }).success).toBe(true);
  });

  it('rejects an unknown hosting target', () => {
    expect(sliceConfigSchema.safeParse({ ...valid, hosting: 'ftp' }).success).toBe(false);
  });

  // Pivot RC1.4 — the user no longer types a token; it is auto-managed, so a
  // config without mcpServerToken stays valid whatever the hosting target.
  it('keeps mcpServerToken optional whatever the hosting (RC1.4)', () => {
    const noToken = { ...valid, mcpServerToken: undefined };
    expect(sliceConfigSchema.safeParse({ ...noToken, hosting: 'cloud' }).success).toBe(true);
    expect(sliceConfigSchema.safeParse({ ...noToken, hosting: 'self' }).success).toBe(true);
  });

  // Pivot RC1.4 supersedes the old "token required over HTTP" rule: the token
  // is auto-managed, so its absence never invalidates the config regardless of
  // transport mode. (Covered more directly by the hosting-based test above.)
  it('allows a missing mcpServerToken in any mode', () => {
    const noToken = { ...valid, mcpServerToken: undefined };
    expect(sliceConfigSchema.safeParse({ ...noToken, mode: 'remote' }).success).toBe(true);
    expect(sliceConfigSchema.safeParse({ ...noToken, mode: 'both' }).success).toBe(true);
    expect(sliceConfigSchema.safeParse({ ...noToken, mode: 'local' }).success).toBe(true);
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

describe('generateRequestSchema', () => {
  const validRequest = {
    parsedSpec: { apiName: 'X', apiVersion: '1', baseUrl: '', authType: 'none', groups: [] },
    rawSpec: 'openapi: "3.0.3"\ninfo: { title: x, version: "1" }\npaths: {}\n',
    selectedIds: ['GET /things'],
    config: valid,
  };

  it('accepts a valid request', async () => {
    const { generateRequestSchema } = await import('./config-schema');
    expect(generateRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it('rejects an empty selectedIds array (must pick at least one)', async () => {
    const { generateRequestSchema } = await import('./config-schema');
    const empty = { ...validRequest, selectedIds: [] };
    expect(generateRequestSchema.safeParse(empty).success).toBe(false);
  });

  it('rejects an invalid config inside the request (delegated to sliceConfigSchema)', async () => {
    const { generateRequestSchema } = await import('./config-schema');
    const bad = { ...validRequest, config: { ...valid, mcpName: 'Bad Name' } };
    expect(generateRequestSchema.safeParse(bad).success).toBe(false);
  });
});

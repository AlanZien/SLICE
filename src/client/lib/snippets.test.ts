import { describe, it, expect } from 'vitest';
import {
  buildClaudeDesktopSnippet,
  buildN8nSnippet,
  buildAiriaSnippet,
  buildHostedClaudeSnippet,
  buildHostedN8nSnippet,
  buildHostedAiriaSnippet,
  TOKEN_PLACEHOLDER,
} from './snippets';
import type { SliceConfig } from '@shared/types';

const BASE: SliceConfig = {
  mcpName: 'shopify-admin',
  baseUrl: 'https://example.myshopify.com/admin/api/2024-04',
  upstreamAuth: { type: 'apiKey', headerName: 'X-Shopify-Access-Token' },
  mode: 'both',
  mcpServerToken: 'a'.repeat(32),
  includeParamDescriptions: false,
  retryOnServerError: false,
};

describe('buildClaudeDesktopSnippet', () => {
  it('returns a JSON string that parses to a valid mcpServers config', () => {
    const out = buildClaudeDesktopSnippet(BASE);
    const parsed = JSON.parse(out);
    expect(parsed.mcpServers['shopify-admin']).toBeDefined();
    expect(parsed.mcpServers['shopify-admin'].command).toBe('node');
    expect(parsed.mcpServers['shopify-admin'].args[0]).toContain('shopify-admin/dist/index.js');
  });

  it('injects the upstream apiKey header into env when auth is apiKey', () => {
    const out = buildClaudeDesktopSnippet(BASE);
    const parsed = JSON.parse(out);
    const env = parsed.mcpServers['shopify-admin'].env;
    expect(env.UPSTREAM_BASE_URL).toBe(BASE.baseUrl);
    expect(env.UPSTREAM_API_KEY).toBeDefined();
  });

  it('uses UPSTREAM_BEARER_TOKEN when auth is bearer', () => {
    const out = buildClaudeDesktopSnippet({ ...BASE, upstreamAuth: { type: 'bearer' } });
    const env = JSON.parse(out).mcpServers['shopify-admin'].env;
    expect(env.UPSTREAM_BEARER_TOKEN).toBeDefined();
    expect(env.UPSTREAM_API_KEY).toBeUndefined();
  });

  it('omits both secret keys when auth is none', () => {
    const out = buildClaudeDesktopSnippet({ ...BASE, upstreamAuth: { type: 'none' } });
    const env = JSON.parse(out).mcpServers['shopify-admin'].env;
    expect(env.UPSTREAM_API_KEY).toBeUndefined();
    expect(env.UPSTREAM_BEARER_TOKEN).toBeUndefined();
  });
});

describe('buildN8nSnippet', () => {
  it('includes the MCP_SERVER_TOKEN as a Bearer in the snippet', () => {
    const out = buildN8nSnippet(BASE);
    expect(out).toContain('Bearer');
    expect(out).toContain(BASE.mcpServerToken!);
  });

  it('references the HTTP transport URL and port placeholder', () => {
    const out = buildN8nSnippet(BASE);
    expect(out).toMatch(/http:\/\/[^\s]*8787/);
  });
});

describe('buildAiriaSnippet', () => {
  it('produces a non-empty snippet mentioning the MCP name', () => {
    const out = buildAiriaSnippet(BASE);
    expect(out.length).toBeGreaterThan(0);
    expect(out).toContain(BASE.mcpName);
  });

  it('includes the Bearer token when present', () => {
    const out = buildAiriaSnippet(BASE);
    expect(out).toContain(BASE.mcpServerToken!);
  });
});

const HOSTED_URL = 'https://slice.test/m/abc123';

describe('hosted (URL-mode) snippets — RC5.3', () => {
  describe('buildHostedClaudeSnippet', () => {
    it('emits a mcp-remote npx block with url and Authorization header', () => {
      const out = buildHostedClaudeSnippet(HOSTED_URL, BASE);
      const parsed = JSON.parse(out);
      const entry = parsed.mcpServers['shopify-admin'];
      expect(entry.command).toBe('npx');
      expect(entry.args).toContain('mcp-remote');
      expect(entry.args).toContain(HOSTED_URL);
      expect(entry.args).toContain(`Authorization:Bearer ${TOKEN_PLACEHOLDER}`);
      // mcp-remote format has no url/headers keys
      expect(entry.url).toBeUndefined();
      expect(entry.headers).toBeUndefined();
    });
  });

  describe('buildHostedN8nSnippet', () => {
    it('references the real url and the token placeholder', () => {
      const out = buildHostedN8nSnippet(HOSTED_URL, BASE);
      expect(out).toContain(HOSTED_URL);
      expect(out).toContain(`Bearer ${TOKEN_PLACEHOLDER}`);
    });
  });

  describe('buildHostedAiriaSnippet', () => {
    it('references the mcp name, the real url and the token placeholder', () => {
      const out = buildHostedAiriaSnippet(HOSTED_URL, BASE);
      expect(out).toContain(BASE.mcpName);
      expect(out).toContain(HOSTED_URL);
      expect(out).toContain(TOKEN_PLACEHOLDER);
    });
  });
});

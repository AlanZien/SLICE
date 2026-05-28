import { describe, it, expect } from 'vitest';
import type { GenerateRequest, ParsedSpec } from '@shared/types';
import { generateMcp } from './mcp-generator';

const SPEC: ParsedSpec = {
  apiName: 'Shopify Admin',
  apiVersion: '2024-04',
  baseUrl: 'https://example.myshopify.com/admin/api/2024-04',
  authType: 'apiKey',
  authHeader: 'X-Shopify-Access-Token',
  groups: [
    {
      tag: 'Products',
      endpoints: [
        {
          id: 'GET /products',
          method: 'GET',
          path: '/products',
          label: 'List products',
          params: [{ name: 'limit', in: 'query', type: 'integer', required: false }],
        },
      ],
    },
  ],
};

function buildRequest(over: Partial<GenerateRequest['config']> = {}): GenerateRequest {
  return {
    parsedSpec: SPEC,
    selectedIds: ['GET /products'],
    config: {
      mcpName: 'shopify-admin',
      baseUrl: SPEC.baseUrl,
      upstreamAuth: { type: 'apiKey', headerName: 'X-Shopify-Access-Token' },
      mode: 'both',
      mcpServerToken: 'a'.repeat(32),
      includeParamDescriptions: true,
      retryOnServerError: false,
      ...over,
    },
  };
}

function asMap(files: ReturnType<typeof generateMcp>): Map<string, string> {
  return new Map(files.map((f) => [f.path, f.content]));
}

describe('generateMcp — static files (07-3)', () => {
  it('emits package.json with the MCP name interpolated', () => {
    const files = asMap(generateMcp(buildRequest()));
    const pkg = files.get('package.json');
    expect(pkg).toBeDefined();
    const parsed = JSON.parse(pkg!);
    expect(parsed.name).toBe('shopify-admin');
    expect(parsed.dependencies['@modelcontextprotocol/sdk']).toBeTruthy();
    expect(parsed.dependencies.zod).toBeTruthy();
  });

  it('emits tsconfig.json with strict mode enabled', () => {
    const files = asMap(generateMcp(buildRequest()));
    const tsconfig = JSON.parse(files.get('tsconfig.json')!);
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });

  it('emits .env.example with UPSTREAM_API_KEY for apiKey auth', () => {
    const env = asMap(generateMcp(buildRequest())).get('.env.example')!;
    expect(env).toContain('UPSTREAM_API_KEY=');
    expect(env).toContain('X-Shopify-Access-Token');
    expect(env).not.toContain('UPSTREAM_BEARER_TOKEN');
  });

  it('emits .env.example with UPSTREAM_BEARER_TOKEN for bearer auth', () => {
    const env = asMap(
      generateMcp(buildRequest({ upstreamAuth: { type: 'bearer' } }))
    ).get('.env.example')!;
    expect(env).toContain('UPSTREAM_BEARER_TOKEN=');
    expect(env).not.toContain('UPSTREAM_API_KEY=');
  });

  it('omits both upstream secrets when auth.type is none', () => {
    const env = asMap(
      generateMcp(buildRequest({ upstreamAuth: { type: 'none' } }))
    ).get('.env.example')!;
    expect(env).not.toContain('UPSTREAM_API_KEY');
    expect(env).not.toContain('UPSTREAM_BEARER_TOKEN');
  });

  it('emits .env.example with MCP_SERVER_TOKEN when HTTP transport ships', () => {
    const env = asMap(generateMcp(buildRequest({ mode: 'both' }))).get('.env.example')!;
    expect(env).toContain('MCP_SERVER_TOKEN=');
    expect(env).toContain('MCP_HTTP_PORT=');
  });

  it('omits MCP_HTTP_PORT for local-only mode', () => {
    const env = asMap(
      generateMcp(buildRequest({ mode: 'local', mcpServerToken: undefined }))
    ).get('.env.example')!;
    expect(env).not.toContain('MCP_HTTP_PORT');
    expect(env).not.toContain('MCP_SERVER_TOKEN');
  });

  it('emits a .gitignore that ignores .env and node_modules', () => {
    const ignore = asMap(generateMcp(buildRequest())).get('.gitignore')!;
    expect(ignore).toContain('node_modules');
    expect(ignore).toContain('.env');
    expect(ignore).toContain('dist');
  });
});

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
    rawSpec: '',
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

describe('generateMcp — logic files (07-4)', () => {
  it('emits src/http-client.ts that injects the configured auth header', () => {
    const files = asMap(generateMcp(buildRequest()));
    const httpClient = files.get('src/http-client.ts');
    expect(httpClient).toBeDefined();
    expect(httpClient).toContain('process.env.UPSTREAM_BASE_URL');
    expect(httpClient).toContain("'X-Shopify-Access-Token'");
    expect(httpClient).toContain('process.env.UPSTREAM_API_KEY');
  });

  it('emits a bearer-style http-client when upstream auth is bearer', () => {
    const files = asMap(generateMcp(buildRequest({ upstreamAuth: { type: 'bearer' } })));
    const httpClient = files.get('src/http-client.ts')!;
    expect(httpClient).toContain('UPSTREAM_BEARER_TOKEN');
    expect(httpClient).toContain('`Bearer ${');
    expect(httpClient).not.toContain('UPSTREAM_API_KEY');
  });

  it('emits a no-auth http-client when upstream auth is none', () => {
    const files = asMap(generateMcp(buildRequest({ upstreamAuth: { type: 'none' } })));
    const httpClient = files.get('src/http-client.ts')!;
    expect(httpClient).not.toContain('UPSTREAM_BEARER_TOKEN');
    expect(httpClient).not.toContain('UPSTREAM_API_KEY');
  });

  it('emits src/tools.ts with one server.tool() call per selected endpoint', () => {
    const files = asMap(generateMcp(buildRequest()));
    const tools = files.get('src/tools.ts')!;
    expect(tools.match(/server\.tool\(/g)?.length).toBe(1);
    expect(tools).toContain('list_products');
  });

  it('omits non-selected endpoints from src/tools.ts', () => {
    const richSpec: ParsedSpec = {
      ...SPEC,
      groups: [
        {
          tag: 'X',
          endpoints: [
            { id: 'GET /a', method: 'GET', path: '/a', label: 'List a', params: [] },
            { id: 'POST /b', method: 'POST', path: '/b', label: 'Create b', params: [] },
            { id: 'DELETE /c', method: 'DELETE', path: '/c', label: 'Delete c', params: [] },
          ],
        },
      ],
    };
    const req: GenerateRequest = {
      parsedSpec: richSpec,
      rawSpec: '',
      selectedIds: ['GET /a', 'DELETE /c'],
      config: buildRequest().config,
    };
    const tools = asMap(generateMcp(req)).get('src/tools.ts')!;
    expect(tools).toContain('list_a');
    expect(tools).not.toContain('create_b');
    expect(tools).toContain('delete_c');
  });

  it('builds the Zod input schema from endpoint params (R1.4.7)', () => {
    const tools = asMap(generateMcp(buildRequest())).get('src/tools.ts')!;
    expect(tools).toContain('limit: z.number().int().optional()');
  });
});

describe('generateMcp — entrypoint and readme (07-5)', () => {
  it('emits src/index.ts with both transports when mode=both', () => {
    const idx = asMap(generateMcp(buildRequest({ mode: 'both' }))).get('src/index.ts')!;
    expect(idx).toContain('StdioServerTransport');
    expect(idx).toContain('StreamableHTTPServerTransport');
    expect(idx).toContain('MCP_TRANSPORT');
  });

  it('emits src/index.ts with only stdio transport when mode=local', () => {
    const idx = asMap(
      generateMcp(buildRequest({ mode: 'local', mcpServerToken: undefined }))
    ).get('src/index.ts')!;
    expect(idx).toContain('StdioServerTransport');
    expect(idx).not.toContain('StreamableHTTPServerTransport');
  });

  it('emits src/index.ts with only http transport when mode=http', () => {
    const idx = asMap(generateMcp(buildRequest({ mode: 'remote' }))).get('src/index.ts')!;
    expect(idx).toContain('StreamableHTTPServerTransport');
    expect(idx).not.toContain('StdioServerTransport');
  });

  it('emits README.md mentioning the MCP name and Claude Desktop stdio snippet when mode allows stdio', () => {
    const readme = asMap(generateMcp(buildRequest({ mode: 'both' }))).get('README.md')!;
    expect(readme).toContain('shopify-admin');
    expect(readme).toContain('Claude Desktop');
    expect(readme).toContain('"command"');
  });

  it('omits the Claude Desktop stdio snippet when mode=http', () => {
    const readme = asMap(generateMcp(buildRequest({ mode: 'remote' }))).get('README.md')!;
    expect(readme).not.toContain('"command"');
    expect(readme).toContain('Bearer');
  });
});

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

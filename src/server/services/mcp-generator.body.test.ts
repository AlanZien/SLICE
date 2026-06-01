// T6 — the generated kit exposes in:body fields and reassembles them into the
// request body passed to call().
import { describe, it, expect } from 'vitest';
import type { Endpoint, GenerateRequest, ParsedSpec } from '@shared/types';
import { generateMcp } from './mcp-generator';

function specWith(endpoint: Endpoint): ParsedSpec {
  return {
    apiName: 'X',
    apiVersion: '1',
    baseUrl: 'https://api.x.test',
    authType: 'none',
    groups: [{ tag: 'X', endpoints: [endpoint] }],
  };
}

function gen(endpoint: Endpoint): string {
  const req: GenerateRequest = {
    parsedSpec: specWith(endpoint),
    rawSpec: '',
    selectedIds: [endpoint.id],
    config: {
      mcpName: 'x',
      baseUrl: 'https://api.x.test',
      upstreamAuth: { type: 'none' },
      mode: 'both',
      includeParamDescriptions: false,
      retryOnServerError: false,
    },
  };
  return new Map(generateMcp(req).map((f) => [f.path, f.content])).get('src/tools.ts')!;
}

describe('generateMcp — request body', () => {
  it('flattened body: exposes fields and passes body: { field: args.field }', () => {
    const tools = gen({
      id: 'POST /search',
      method: 'POST',
      path: '/search',
      label: 'Search',
      params: [
        { name: 'query', in: 'body', type: 'string', required: true, wireName: 'query' },
        {
          name: 'filter',
          in: 'body',
          required: false,
          wireName: 'filter',
          schema: { type: 'object', additionalProperties: true },
        },
      ],
    });
    expect(tools).toContain('query: z.string()');
    expect(tools).toContain('filter: z.object({}).passthrough()');
    expect(tools).toMatch(/body:\s*\{\s*query:\s*args\.query,\s*filter:\s*args\.filter\s*\}/);
  });

  it('quotes hyphenated body field names on both sides', () => {
    const tools = gen({
      id: 'POST /pages',
      method: 'POST',
      path: '/pages',
      label: 'Create page',
      params: [{ name: 'parent-id', in: 'body', type: 'string', required: true, wireName: 'parent-id' }],
    });
    expect(tools).toContain('"parent-id": args["parent-id"]');
  });

  it('fallback whole-body: passes body: args.body directly', () => {
    const tools = gen({
      id: 'POST /bulk',
      method: 'POST',
      path: '/bulk',
      label: 'Bulk',
      params: [{ name: 'body', in: 'body', schema: { type: 'array' }, required: false }],
    });
    expect(tools).toMatch(/body:\s*args\.body,/);
  });
});

import { describe, it, expect } from 'vitest';
import { normalizeSpec } from './spec-normalizer';

const baseSpec = {
  openapi: '3.0.3',
  info: { title: 'Shopify Admin API', version: 'v2024-01' },
  servers: [{ url: 'https://shop.myshopify.com/admin/api' }],
  paths: {},
};

describe('normalizeSpec', () => {
  it('extracts apiName, apiVersion, baseUrl', () => {
    const result = normalizeSpec(baseSpec);
    expect(result.apiName).toBe('Shopify Admin API');
    expect(result.apiVersion).toBe('v2024-01');
    expect(result.baseUrl).toBe('https://shop.myshopify.com/admin/api');
  });

  it('uses operation summary as label (R1.2.2 priority 1)', () => {
    const spec = {
      ...baseSpec,
      paths: {
        '/products': {
          get: { tags: ['Products'], summary: 'Lister les produits', responses: { '200': {} } },
        },
      },
    };
    const result = normalizeSpec(spec);
    expect(result.groups[0].endpoints[0].label).toBe('Lister les produits');
  });

  it('falls back to first line of description when summary is missing (R1.2.2 priority 2)', () => {
    const spec = {
      ...baseSpec,
      paths: {
        '/orders': {
          get: {
            tags: ['Orders'],
            description: 'Liste les commandes\nplus de détails ici',
            responses: { '200': {} },
          },
        },
      },
    };
    const result = normalizeSpec(spec);
    expect(result.groups[0].endpoints[0].label).toBe('Liste les commandes');
  });

  it('generates a default label from method + path when summary and description are missing but operationId is set (R1.2.2 priority 3)', () => {
    // 12.b — operationId must be present for the endpoint to survive the
    // exclusion filter. We still want priority-3 label generation when only
    // operationId is present (no summary, no description).
    const spec = {
      ...baseSpec,
      paths: {
        '/customers': {
          get: { tags: ['Customers'], operationId: 'listCustomers', responses: { '200': {} } },
          post: { tags: ['Customers'], operationId: 'createCustomer', responses: { '201': {} } },
          delete: { tags: ['Customers'], operationId: 'deleteCustomer', responses: { '204': {} } },
        },
        '/customers/{id}': {
          put: { tags: ['Customers'], operationId: 'updateCustomer', responses: { '200': {} } },
        },
      },
    };
    const result = normalizeSpec(spec);
    const labels = result.groups
      .flatMap((g) => g.endpoints)
      .map((e) => `${e.method} ${e.label}`);
    expect(labels).toContain('GET List customers');
    expect(labels).toContain('POST Create a customers');
    expect(labels).toContain('DELETE Delete a customers');
    expect(labels).toContain('PUT Update a customers');
  });

  it('groups endpoints by their first tag (R1.2.3)', () => {
    const spec = {
      ...baseSpec,
      paths: {
        '/a': { get: { tags: ['Alpha'], summary: 'a', responses: { '200': {} } } },
        '/b': { get: { tags: ['Beta'], summary: 'b', responses: { '200': {} } } },
        '/c': { get: { tags: ['Alpha'], summary: 'c', responses: { '200': {} } } },
      },
    };
    const result = normalizeSpec(spec);
    const alpha = result.groups.find((g) => g.tag === 'Alpha');
    const beta = result.groups.find((g) => g.tag === 'Beta');
    expect(alpha?.endpoints).toHaveLength(2);
    expect(beta?.endpoints).toHaveLength(1);
  });

  it('falls back to "Other" group when no tag is present (R1.2.3)', () => {
    const spec = {
      ...baseSpec,
      paths: {
        '/orphan': { get: { summary: 'no tag', responses: { '200': {} } } },
      },
    };
    const result = normalizeSpec(spec);
    expect(result.groups[0].tag).toBe('Other');
  });

  it('excludes HEAD, OPTIONS and TRACE methods (cas limite SPEC 1.2)', () => {
    const spec = {
      ...baseSpec,
      paths: {
        '/x': {
          get: { tags: ['x'], summary: 'g', responses: { '200': {} } },
          head: { tags: ['x'], summary: 'h', responses: { '200': {} } },
          options: { tags: ['x'], summary: 'o', responses: { '200': {} } },
          trace: { tags: ['x'], summary: 't', responses: { '200': {} } },
        },
      },
    };
    const result = normalizeSpec(spec);
    const methods = result.groups[0].endpoints.map((e) => e.method);
    expect(methods).toEqual(['GET']);
  });

  it('produces a stable id "<METHOD> <path>"', () => {
    const spec = {
      ...baseSpec,
      paths: {
        '/products/{id}': {
          get: { tags: ['Products'], summary: 'detail', responses: { '200': {} } },
        },
      },
    };
    const result = normalizeSpec(spec);
    expect(result.groups[0].endpoints[0].id).toBe('GET /products/{id}');
  });

  it('flattens parameters from the operation', () => {
    const spec = {
      ...baseSpec,
      paths: {
        '/products': {
          get: {
            tags: ['Products'],
            summary: 'list',
            parameters: [
              { name: 'limit', in: 'query', schema: { type: 'integer' }, required: false },
              {
                name: 'q',
                in: 'query',
                schema: { type: 'string' },
                required: true,
                description: 'search query',
              },
            ],
            responses: { '200': {} },
          },
        },
      },
    };
    const result = normalizeSpec(spec);
    const params = result.groups[0].endpoints[0].params;
    expect(params).toHaveLength(2);
    expect(params[0]).toMatchObject({ name: 'limit', in: 'query', type: 'integer', required: false });
    expect(params[1]).toMatchObject({ name: 'q', required: true, description: 'search query' });
  });

  it('returns "Untitled API" when info.title is missing', () => {
    const spec = { openapi: '3.0.0', info: {}, paths: { '/x': { get: { responses: {} } } } };
    expect(normalizeSpec(spec).apiName).toBe('Untitled API');
  });

  it('produces a defaultConfig with slugified name + detected auth + token (phase 06)', () => {
    const spec = {
      ...baseSpec,
      info: { title: 'Shopify Admin API', version: 'v1' },
      paths: { '/x': { get: { summary: 'x', responses: { '200': {} } } } },
      components: {
        securitySchemes: {
          ApiKey: { type: 'apiKey', name: 'X-Shopify-Access-Token', in: 'header' },
        },
      },
    };
    const result = normalizeSpec(spec);
    expect(result.defaultConfig).toBeDefined();
    expect(result.defaultConfig?.mcpName).toBe('shopify-admin-api');
    expect(result.defaultConfig?.baseUrl).toBe(baseSpec.servers[0].url);
    expect(result.defaultConfig?.upstreamAuth).toEqual({
      type: 'apiKey',
      headerName: 'X-Shopify-Access-Token',
    });
    expect(result.defaultConfig?.mcpServerToken).toMatch(/^[a-f0-9]{32}$/);
  });

  it('falls back to mcp-server-<hash> when info.title is missing in defaultConfig', () => {
    const spec = { openapi: '3.0.0', info: {}, paths: { '/x': { get: { summary: 'x', responses: { '200': {} } } } } };
    const result = normalizeSpec(spec);
    expect(result.defaultConfig?.mcpName).toMatch(/^mcp-server-[a-f0-9]{4}$/);
  });

  it('excludes endpoints that have no operationId AND no summary AND no usable description (12.b)', () => {
    const spec = {
      ...baseSpec,
      paths: {
        '/keep': {
          get: { tags: ['T'], summary: 'documented', responses: { '200': {} } },
        },
        '/drop-bare': {
          get: { tags: ['T'], responses: { '200': {} } },
        },
        '/drop-empty-desc': {
          get: { tags: ['T'], description: '   ', responses: { '200': {} } },
        },
        '/keep-via-opid': {
          get: { tags: ['T'], operationId: 'listKept', responses: { '200': {} } },
        },
      },
    };
    const result = normalizeSpec(spec);
    const labels = result.groups.flatMap((g) => g.endpoints).map((e) => e.path);
    expect(labels).toContain('/keep');
    expect(labels).toContain('/keep-via-opid');
    expect(labels).not.toContain('/drop-bare');
    expect(labels).not.toContain('/drop-empty-desc');
    expect(result.excludedCount).toBe(2);
  });

  it('flags deprecated endpoints (12.c) without dropping them', () => {
    const spec = {
      ...baseSpec,
      paths: {
        '/legacy': {
          get: { tags: ['T'], summary: 'old', deprecated: true, responses: { '200': {} } },
        },
        '/current': {
          get: { tags: ['T'], summary: 'new', responses: { '200': {} } },
        },
      },
    };
    const endpoints = normalizeSpec(spec).groups.flatMap((g) => g.endpoints);
    const legacy = endpoints.find((e) => e.path === '/legacy');
    const current = endpoints.find((e) => e.path === '/current');
    expect(legacy?.deprecated).toBe(true);
    expect(current?.deprecated).toBeFalsy();
  });
});

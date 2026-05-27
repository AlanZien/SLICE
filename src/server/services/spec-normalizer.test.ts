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

  it('generates a default label from method + path when both summary and description are missing (R1.2.2 priority 3)', () => {
    const spec = {
      ...baseSpec,
      paths: {
        '/customers': {
          get: { tags: ['Customers'], responses: { '200': {} } },
          post: { tags: ['Customers'], responses: { '201': {} } },
          delete: { tags: ['Customers'], responses: { '204': {} } },
        },
        '/customers/{id}': {
          put: { tags: ['Customers'], responses: { '200': {} } },
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
});

// T4 — the normalizer flattens a JSON requestBody into in:'body' params.
import { describe, it, expect } from 'vitest';
import { normalizeSpec } from './spec-normalizer';
import type { EndpointParam } from '@shared/types';

const base = {
  openapi: '3.0.3',
  info: { title: 'X', version: '1' },
  servers: [{ url: 'https://api.x.test' }],
};

function paramsOf(doc: unknown): EndpointParam[] {
  const spec = normalizeSpec(doc);
  return spec.groups[0]!.endpoints[0]!.params;
}
const bodyParams = (ps: EndpointParam[]) => ps.filter((p) => p.in === 'body');

describe('normalizeSpec — requestBody flattening', () => {
  it('flattens object properties into in:body params (required + description + wireName)', () => {
    const ps = paramsOf({
      ...base,
      paths: {
        '/search': {
          post: {
            summary: 'Search',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string', description: 'the query' },
                      filter: { type: 'object', properties: { value: { type: 'string' } } },
                    },
                    required: ['query'],
                  },
                },
              },
            },
            responses: { '200': {} },
          },
        },
      },
    });
    const body = bodyParams(ps);
    const query = body.find((p) => p.name === 'query')!;
    const filter = body.find((p) => p.name === 'filter')!;
    expect(query).toMatchObject({ in: 'body', required: true, wireName: 'query', description: 'the query' });
    expect(filter).toMatchObject({ in: 'body', required: false, wireName: 'filter' });
    expect(filter.schema?.type).toBe('object'); // nested schema carried
  });

  it('falls back to a single `body` param when the body is not an object', () => {
    const ps = paramsOf({
      ...base,
      paths: {
        '/bulk': {
          post: {
            summary: 'Bulk',
            requestBody: {
              content: { 'application/json': { schema: { type: 'array', items: { type: 'string' } } } },
            },
            responses: { '200': {} },
          },
        },
      },
    });
    const body = bodyParams(ps);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ name: 'body', in: 'body' });
    expect(body[0]!.wireName).toBeUndefined(); // marks the whole-body fallback
  });

  it('ignores a non-JSON requestBody (multipart) — no body params', () => {
    const ps = paramsOf({
      ...base,
      paths: {
        '/upload': {
          post: {
            summary: 'Upload',
            requestBody: { content: { 'multipart/form-data': { schema: { type: 'object' } } } },
            responses: { '200': {} },
          },
        },
      },
    });
    expect(bodyParams(ps)).toHaveLength(0);
  });

  it('disambiguates a body field that collides with an existing param', () => {
    const ps = paramsOf({
      ...base,
      paths: {
        '/x': {
          post: {
            summary: 'X',
            parameters: [{ name: 'filter', in: 'query', schema: { type: 'string' } }],
            requestBody: {
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { filter: { type: 'object' } } },
                },
              },
            },
            responses: { '200': {} },
          },
        },
      },
    });
    const body = bodyParams(ps);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ name: 'filter_body', wireName: 'filter', in: 'body' });
    // the original query param is untouched
    expect(ps.find((p) => p.in === 'query' && p.name === 'filter')).toBeTruthy();
  });

  it('a GET without requestBody has no body params (non-regression)', () => {
    const ps = paramsOf({
      ...base,
      paths: {
        '/things': { get: { summary: 'List', responses: { '200': {} } } },
      },
    });
    expect(bodyParams(ps)).toHaveLength(0);
  });
});

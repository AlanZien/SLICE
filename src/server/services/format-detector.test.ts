import { describe, it, expect } from 'vitest';
import { detectFormat } from './format-detector';

const OPENAPI_3 = `openapi: "3.0.3"
info: { title: t, version: "1" }
paths: {}
`;

const SWAGGER_2 = `swagger: "2.0"
info: { title: t, version: "1" }
paths: {}
`;

const POSTMAN_V2 = JSON.stringify({
  info: {
    name: 'demo',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  item: [{ name: 'get things', request: { method: 'GET', url: 'https://api.demo/things' } }],
});

const GRAPHQL_SDL = `type Query {
  things: [Thing!]!
}
type Thing { id: ID! }
`;

describe('detectFormat', () => {
  it('returns "openapi3" for an OpenAPI 3.x document', () => {
    expect(detectFormat(OPENAPI_3)).toBe('openapi3');
  });

  it('returns "swagger2" for a Swagger 2.0 document', () => {
    expect(detectFormat(SWAGGER_2)).toBe('swagger2');
  });

  it('returns "postman" for a Postman Collection v2 document', () => {
    expect(detectFormat(POSTMAN_V2)).toBe('postman');
  });

  it('returns "unknown" for a GraphQL SDL', () => {
    expect(detectFormat(GRAPHQL_SDL)).toBe('unknown');
  });

  it('returns "unknown" for empty or unparseable input', () => {
    expect(detectFormat('')).toBe('unknown');
    expect(detectFormat('::::: not yaml or json :::::')).toBe('unknown');
  });

  it('detects Postman v2.0 schema URL too (not just v2.1)', () => {
    const v20 = JSON.stringify({
      info: {
        name: 'old',
        schema: 'https://schema.getpostman.com/json/collection/v2.0.0/collection.json',
      },
      item: [],
    });
    expect(detectFormat(v20)).toBe('postman');
  });
});

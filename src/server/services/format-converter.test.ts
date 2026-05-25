import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { convertToOpenAPI3 } from './format-converter';
import { ParseError } from '@shared/types';

const FIXTURES = resolve(__dirname, '../../../fixtures');

function load(name: string): string {
  return readFileSync(resolve(FIXTURES, name), 'utf-8');
}

const OPENAPI_3 = `openapi: "3.0.3"
info: { title: native, version: "1" }
paths:
  /x:
    get: { summary: g, responses: { "200": { description: ok } } }
`;

describe('convertToOpenAPI3', () => {
  it('passes OpenAPI 3.x through unchanged', async () => {
    const out = await convertToOpenAPI3(OPENAPI_3);
    expect(out).toBe(OPENAPI_3);
  });

  it('converts Swagger 2.0 (petstore) to a valid OpenAPI 3.x string', async () => {
    const out = await convertToOpenAPI3(load('petstore-swagger2.json'));
    // Parsed result must declare openapi >= 3.0
    const parsed = JSON.parse(out);
    expect(parsed.openapi).toMatch(/^3\./);
    expect(parsed.paths['/pet']).toBeDefined();
    expect(parsed.info.title).toBe('Petstore (Swagger 2.0)');
  });

  it('converts Postman Collection v2 (shopify) to an OpenAPI 3.x string', async () => {
    const out = await convertToOpenAPI3(load('shopify-postman-v2.json'));
    // postman-to-openapi returns YAML by default — accept either YAML or JSON.
    expect(out).toMatch(/openapi:\s*['"]?3\.|"openapi":\s*"3\./);
    expect(out).toMatch(/products|orders/i);
  });

  it('throws UNSUPPORTED_FORMAT on GraphQL SDL', async () => {
    await expect(convertToOpenAPI3(load('graphql-sdl.txt'))).rejects.toMatchObject({
      code: 'UNSUPPORTED_FORMAT',
    });
  });

  it('throws SWAGGER2_CONVERSION_FAILED on a corrupt Swagger 2.0 doc', async () => {
    // Has `swagger: "2.0"` so detector returns swagger2, but no `paths` and
    // bogus structure → swagger2openapi rejects.
    const corrupt = `swagger: "2.0"
info: { title: bad, version: "1" }
paths: not-an-object
`;
    await expect(convertToOpenAPI3(corrupt)).rejects.toMatchObject({
      code: 'SWAGGER2_CONVERSION_FAILED',
    });
  });

  it('throws POSTMAN_CONVERSION_FAILED on a corrupt Postman collection', async () => {
    const corrupt = JSON.stringify({
      info: {
        name: 'bad',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      // `item` should be an array — postman-to-openapi will crash.
      item: 'not-an-array',
    });
    await expect(convertToOpenAPI3(corrupt)).rejects.toMatchObject({
      code: 'POSTMAN_CONVERSION_FAILED',
    });
  });

  it('returns ParseError instances (not plain objects) for all failure paths', async () => {
    try {
      await convertToOpenAPI3('::: not anything');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError);
    }
  });
});

// T3 — toZodShape: convert a (dereferenced) OpenAPI schema into the narrow
// ZodSchemaShape the builders consume. Pure, recursive.
import { describe, it, expect } from 'vitest';
import { toZodShape } from './zod-schema-builder';

describe('toZodShape', () => {
  it('maps an object: properties recursed, required[] → requiredFields', () => {
    const shape = toZodShape({
      type: 'object',
      properties: { query: { type: 'string' }, count: { type: 'integer' } },
      required: ['query'],
    });
    expect(shape.type).toBe('object');
    expect(shape.properties?.query?.type).toBe('string');
    expect(shape.properties?.count?.type).toBe('integer');
    expect(shape.requiredFields).toEqual(['query']);
  });

  it('recurses into nested objects', () => {
    const shape = toZodShape({
      type: 'object',
      properties: { filter: { type: 'object', properties: { value: { type: 'string' } } } },
    });
    expect(shape.properties?.filter?.type).toBe('object');
    expect(shape.properties?.filter?.properties?.value?.type).toBe('string');
  });

  it('maps an array via items', () => {
    const shape = toZodShape({ type: 'array', items: { type: 'string' } });
    expect(shape.type).toBe('array');
    expect(shape.items?.type).toBe('string');
  });

  it('maps a scalar to its type', () => {
    expect(toZodShape({ type: 'integer' })).toMatchObject({ type: 'integer' });
  });

  it('treats an object without properties as a permissive (free-form) object', () => {
    const shape = toZodShape({ type: 'object', additionalProperties: true });
    expect(shape.type).toBe('object');
    expect(shape.properties).toBeUndefined();
    expect(shape.additionalProperties).toBe(true);
  });

  it('honours additionalProperties:false (strict)', () => {
    const shape = toZodShape({ type: 'object', properties: { a: { type: 'string' } }, additionalProperties: false });
    expect(shape.additionalProperties).toBe(false);
  });

  it('carries the description', () => {
    expect(toZodShape({ type: 'string', description: 'the query' }).description).toBe('the query');
  });

  it('an unusable schema yields an empty shape (string fallback)', () => {
    expect(toZodShape(null)).toEqual({});
    expect(toZodShape('nope')).toEqual({});
  });
});

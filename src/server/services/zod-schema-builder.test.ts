import { describe, it, expect } from 'vitest';
import { buildZodExpression } from './zod-schema-builder';

describe('buildZodExpression', () => {
  describe('primitive types', () => {
    it('strings → z.string()', () => {
      expect(buildZodExpression({ type: 'string', required: true })).toBe('z.string()');
    });

    it('integers → z.number().int()', () => {
      expect(buildZodExpression({ type: 'integer', required: true })).toBe('z.number().int()');
    });

    it('numbers → z.number()', () => {
      expect(buildZodExpression({ type: 'number', required: true })).toBe('z.number()');
    });

    it('booleans → z.boolean()', () => {
      expect(buildZodExpression({ type: 'boolean', required: true })).toBe('z.boolean()');
    });

    it('unknown / missing types → z.string() (safe default)', () => {
      expect(buildZodExpression({ required: true })).toBe('z.string()');
      expect(buildZodExpression({ type: 'mystery', required: true })).toBe('z.string()');
    });
  });

  describe('arrays', () => {
    it('array of strings → z.array(z.string())', () => {
      expect(
        buildZodExpression({ type: 'array', items: { type: 'string' }, required: true })
      ).toBe('z.array(z.string())');
    });

    it('array of integers → z.array(z.number().int())', () => {
      expect(
        buildZodExpression({ type: 'array', items: { type: 'integer' }, required: true })
      ).toBe('z.array(z.number().int())');
    });

    it('array without items → z.array(z.unknown())', () => {
      expect(buildZodExpression({ type: 'array', required: true })).toBe('z.array(z.unknown())');
    });
  });

  describe('objects', () => {
    it('object with single property → z.object({ a: z.string() })', () => {
      expect(
        buildZodExpression({
          type: 'object',
          required: true,
          properties: { a: { type: 'string' } },
        })
      ).toBe('z.object({ a: z.string() })');
    });

    it('object with required + optional mixed properties', () => {
      const out = buildZodExpression({
        type: 'object',
        required: true,
        properties: {
          id: { type: 'string' },
          limit: { type: 'integer' },
        },
        requiredFields: ['id'],
      });
      // id required → no .optional(); limit not in requiredFields → .optional()
      expect(out).toContain('id: z.string()');
      expect(out).toContain('limit: z.number().int().optional()');
    });

    it('object without properties → z.object({})', () => {
      expect(buildZodExpression({ type: 'object', required: true })).toBe('z.object({})');
    });
  });

  describe('modifiers', () => {
    it('not-required adds .optional()', () => {
      expect(buildZodExpression({ type: 'string', required: false })).toBe(
        'z.string().optional()'
      );
    });

    it('description + includeDescriptions=true appends .describe()', () => {
      const out = buildZodExpression(
        { type: 'string', required: true, description: 'Pet identifier' },
        true
      );
      expect(out).toBe('z.string().describe("Pet identifier")');
    });

    it('description + includeDescriptions=false omits .describe()', () => {
      const out = buildZodExpression(
        { type: 'string', required: true, description: 'Pet identifier' },
        false
      );
      expect(out).toBe('z.string()');
    });

    it('safely escapes double quotes inside descriptions', () => {
      const out = buildZodExpression(
        { type: 'string', required: true, description: 'Has "quotes" inside' },
        true
      );
      expect(out).toBe('z.string().describe("Has \\"quotes\\" inside")');
    });

    it('combines .optional() and .describe() in that order', () => {
      const out = buildZodExpression(
        { type: 'string', required: false, description: 'opt with desc' },
        true
      );
      expect(out).toBe('z.string().optional().describe("opt with desc")');
    });
  });
});

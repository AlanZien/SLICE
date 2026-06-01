// T2 — the kit (string) and hosted (runtime) Zod builders must agree on body
// objects: undeclared keys are KEPT (passthrough), required fields enforced,
// `{}` accepted when nothing is required, scalars rejected for object fields.
// Behavioural parity is asserted on the runtime side; the string side is
// checked structurally (it must emit `.passthrough()`).
import { describe, it, expect } from 'vitest';
import type { ZodSchemaShape } from '@shared/types';
import { buildZodExpression } from './zod-schema-builder';
import { buildZodSchema } from './hosted-mcp-factory';

const OBJ_WITH_PROPS: ZodSchemaShape = {
  type: 'object',
  properties: { a: { type: 'string' }, b: { type: 'string' } },
  requiredFields: ['a'],
};

const FREE_FORM: ZodSchemaShape = {
  type: 'object',
  additionalProperties: true,
};

describe('runtime buildZodSchema — permissive objects (passthrough)', () => {
  it('keeps undeclared keys instead of stripping them', () => {
    const schema = buildZodSchema(OBJ_WITH_PROPS);
    const res = schema.safeParse({ a: 'x', b: 'y', extra: 42 });
    expect(res.success).toBe(true);
    if (res.success) expect((res.data as Record<string, unknown>).extra).toBe(42);
  });

  it('enforces required fields', () => {
    const schema = buildZodSchema(OBJ_WITH_PROPS);
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ a: 'x' }).success).toBe(true);
  });

  it('rejects a scalar where an object is expected', () => {
    const schema = buildZodSchema(OBJ_WITH_PROPS);
    expect(schema.safeParse('nope').success).toBe(false);
  });

  it('free-form object keeps every key and accepts {}', () => {
    const schema = buildZodSchema(FREE_FORM);
    const res = schema.safeParse({ foo: 1, bar: 2 });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toEqual({ foo: 1, bar: 2 });
    expect(schema.safeParse({}).success).toBe(true);
  });
});

describe('kit buildZodExpression — emits passthrough for objects (parity)', () => {
  it('renders .passthrough() on object schemas', () => {
    const expr = buildZodExpression(OBJ_WITH_PROPS);
    expect(expr).toContain('z.object({');
    expect(expr).toContain('.passthrough()');
  });

  it('renders a passthrough object for free-form objects', () => {
    const expr = buildZodExpression(FREE_FORM);
    expect(expr).toContain('.passthrough()');
  });
});

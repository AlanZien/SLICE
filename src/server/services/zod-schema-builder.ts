/**
 * Translate a (very simplified) OpenAPI schema fragment into a Zod expression
 * string that the generator pastes verbatim into the emitted `tools.ts`.
 *
 * Why a string and not a real Zod object? Because the output lives in source
 * code that ships in the user's ZIP. We need exact, formatted, copy-pasteable
 * source — building Zod runtimes here just to `.toString()` them later would
 * be lossier and slower.
 *
 * The shape we accept is intentionally narrow (it mirrors what
 * `spec-normalizer`'s `EndpointParam` and a few OpenAPI extensions we care
 * about expose). Anything we don't recognise falls back to `z.string()` so
 * the generated MCP keeps compiling and the user gets *some* validation
 * rather than a runtime crash.
 */

// ZodSchemaShape now lives in `@shared/types` so EndpointParam can carry a
// nested body-field schema. Re-exported here for back-compat with existing
// `./zod-schema-builder` imports.
export type { ZodSchemaShape } from '@shared/types';
import type { ZodSchemaShape } from '@shared/types';

/**
 * Convert a (dereferenced) OpenAPI schema into the narrow `ZodSchemaShape` the
 * builders consume. Pure and recursive. OpenAPI's `required: string[]` (list of
 * required property names) maps to `requiredFields`; `additionalProperties`
 * carries through (objects are permissive unless it's explicitly `false`).
 * An unusable input yields an empty shape (→ `z.string()` fallback downstream).
 */
export function toZodShape(schema: unknown): ZodSchemaShape {
  if (!schema || typeof schema !== 'object') return {};
  const s = schema as Record<string, unknown>;
  const type = typeof s.type === 'string' ? s.type.toLowerCase() : undefined;
  const description = typeof s.description === 'string' ? s.description : undefined;
  const base: ZodSchemaShape = {};
  if (description) base.description = description;

  const looksObject = type === 'object' || s.properties != null || s.additionalProperties != null;
  if (looksObject) {
    base.type = 'object';
    if (s.properties && typeof s.properties === 'object') {
      const properties: Record<string, ZodSchemaShape> = {};
      for (const [key, value] of Object.entries(s.properties as Record<string, unknown>)) {
        properties[key] = toZodShape(value);
      }
      base.properties = properties;
      base.requiredFields = Array.isArray(s.required)
        ? (s.required as unknown[]).filter((x): x is string => typeof x === 'string')
        : [];
    }
    base.additionalProperties = s.additionalProperties !== false;
    return base;
  }

  if (type === 'array') {
    base.type = 'array';
    if (s.items != null) base.items = toZodShape(s.items);
    return base;
  }

  if (type) base.type = type;
  return base;
}

export function buildZodExpression(
  shape: ZodSchemaShape,
  includeDescriptions = false
): string {
  const base = baseExpression(shape, includeDescriptions);
  const withOptional = shape.required === false ? `${base}.optional()` : base;
  if (includeDescriptions && typeof shape.description === 'string' && shape.description.length > 0) {
    return `${withOptional}.describe(${escapeStringLiteral(shape.description)})`;
  }
  return withOptional;
}

/**
 * Emit a JS object property key. Identifiers (`foo`, `_x`, `$z`) render
 * bare; anything else (hyphens, dots, leading digit, etc.) is JSON-quoted
 * so the generated source compiles. Header-style names like
 * `Notion-Version` and `Content-Type` are the most common offenders.
 */
export function formatPropertyKey(name: string): string {
  if (/^[A-Za-z_$][\w$]*$/.test(name)) return name;
  return JSON.stringify(name);
}

function baseExpression(shape: ZodSchemaShape, includeDescriptions: boolean): string {
  const type = (shape.type ?? '').toLowerCase();
  switch (type) {
    case 'integer':
      return 'z.number().int()';
    case 'number':
      return 'z.number()';
    case 'boolean':
      return 'z.boolean()';
    case 'array': {
      const inner = shape.items
        ? // Items always render as "required" in their inner form — wrapping
          // `z.optional()` would invent semantics OpenAPI didn't.
          buildZodExpression({ ...shape.items, required: true }, includeDescriptions)
        : 'z.unknown()';
      return `z.array(${inner})`;
    }
    case 'object': {
      const props = shape.properties ?? {};
      const requiredSet = new Set(shape.requiredFields ?? []);
      const entries = Object.entries(props).map(([name, child]) => {
        const childExpr = buildZodExpression(
          { ...child, required: requiredSet.has(name) },
          includeDescriptions
        );
        return `${formatPropertyKey(name)}: ${childExpr}`;
      });
      // `.passthrough()` keeps undeclared keys — request bodies routinely carry
      // free-form objects (e.g. Notion page `properties`) that z.object would
      // otherwise strip. Kept in lockstep with the runtime builder.
      const obj = entries.length === 0 ? 'z.object({})' : `z.object({ ${entries.join(', ')} })`;
      return `${obj}.passthrough()`;
    }
    case 'string':
    default:
      return 'z.string()';
  }
}

function escapeStringLiteral(input: string): string {
  return `"${input.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

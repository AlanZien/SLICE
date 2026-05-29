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

export interface ZodSchemaShape {
  type?: string;
  required?: boolean;
  description?: string;
  items?: ZodSchemaShape;
  properties?: Record<string, ZodSchemaShape>;
  /** Names of fields that must be present when `type === 'object'`. */
  requiredFields?: ReadonlyArray<string>;
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
      return entries.length === 0 ? 'z.object({})' : `z.object({ ${entries.join(', ')} })`;
    }
    case 'string':
    default:
      return 'z.string()';
  }
}

function escapeStringLiteral(input: string): string {
  return `"${input.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

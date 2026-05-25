/**
 * Format converter — turns Swagger 2.0 or Postman Collection v2 into an
 * OpenAPI 3.x string that the phase-02 parser can consume unchanged.
 *
 * Conversion is silent (R1.1.3): the user uploads a file, SLICE figures out
 * the format, converts when needed, and parses. No UI distinction.
 *
 * Failure modes are typed via `ParseError`:
 * - `UNSUPPORTED_FORMAT`           — detector returned `'unknown'`
 * - `SWAGGER2_CONVERSION_FAILED`   — swagger2openapi rejected the doc
 * - `POSTMAN_CONVERSION_FAILED`    — postman-to-openapi rejected the collection
 *
 * Native OpenAPI 3.x is returned verbatim — no re-encoding, no normalisation.
 */
import postmanToOpenApi from 'postman-to-openapi';
// swagger2openapi ships no type definitions; ambient declaration kept inline
// rather than as a top-level d.ts so it stays scoped to this file.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const swagger2openapi: {
  convertStr: (
    str: string,
    options: Record<string, unknown>
  ) => Promise<{ openapi: unknown }>;
} = require('swagger2openapi');
import { ParseError } from '@shared/types';
import { detectFormat } from './format-detector';

// `fetch: false` (and `resolve: false`) keep swagger2openapi from reaching out
// to remote $ref hosts during conversion. Belt-and-suspenders alongside the
// `assertNoExternalRefs` pre-scan that runs later in parseSpec.
const SWAGGER2OPENAPI_OPTIONS = {
  patch: true,        // auto-fix harmless schema lint warnings
  warnOnly: true,     // never throw on warnings
  resolve: false,     // do not dereference $refs
  fetch: false,       // explicitly disable HTTP fetching
  fatal: false,       // keep going on non-fatal issues
} as const;

const POSTMAN_OPTIONS = {
  defaultTag: 'general',
} as const;

function isPlausibleOpenApi3(doc: unknown): boolean {
  if (!doc || typeof doc !== 'object') return false;
  const d = doc as Record<string, unknown>;
  if (typeof d.openapi !== 'string' || !/^3\./.test(d.openapi)) return false;
  // `paths` is the only field we strictly need downstream; it must be an
  // object (possibly empty — emptiness is checked later in parser.ts).
  if (typeof d.paths !== 'object' || d.paths === null || Array.isArray(d.paths)) {
    return false;
  }
  return true;
}

export async function convertToOpenAPI3(raw: string): Promise<string> {
  const format = detectFormat(raw);

  switch (format) {
    case 'openapi3':
      // Hot path — no transformation, the parser does the heavy lifting.
      return raw;

    case 'swagger2': {
      let openapi: unknown;
      try {
        const result = await swagger2openapi.convertStr(raw, {
          ...SWAGGER2OPENAPI_OPTIONS,
        });
        openapi = result.openapi;
      } catch (err) {
        throw new ParseError(
          'SWAGGER2_CONVERSION_FAILED',
          `Swagger 2.0 conversion failed: ${(err as Error).message}`
        );
      }
      // `warnOnly: true` lets the converter silently coerce a malformed
      // input into a structurally invalid OpenAPI 3 doc (e.g.
      // `paths: "not-an-object"` passes through as a string). Re-check the
      // shape so we surface a meaningful conversion error instead of
      // shipping garbage to the downstream parser.
      if (!isPlausibleOpenApi3(openapi)) {
        throw new ParseError(
          'SWAGGER2_CONVERSION_FAILED',
          'Swagger 2.0 conversion produced an invalid OpenAPI 3 document.'
        );
      }
      return JSON.stringify(openapi);
    }

    case 'postman':
      try {
        // postman-to-openapi accepts a JSON string and returns YAML by default.
        const yamlOut = await postmanToOpenApi(raw, undefined, POSTMAN_OPTIONS);
        return yamlOut;
      } catch (err) {
        throw new ParseError(
          'POSTMAN_CONVERSION_FAILED',
          `Postman conversion failed: ${(err as Error).message}`
        );
      }

    case 'unknown':
    default:
      throw new ParseError(
        'UNSUPPORTED_FORMAT',
        'Unsupported file format. Use OpenAPI 3.x, Swagger 2.0, or Postman Collection v2.'
      );
  }
}

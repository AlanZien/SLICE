/**
 * Format detector — identifies the source format of an uploaded spec from
 * its raw content, before any conversion or validation runs.
 *
 * Recognised formats:
 * - `openapi3`  : OpenAPI 3.0.x / 3.1.x  (root `openapi: "3.x..."`)
 * - `swagger2`  : Swagger / OpenAPI 2.0  (root `swagger: "2.0"`)
 * - `postman`   : Postman Collection v2.x (root `info.schema` matches
 *                 `https://schema.getpostman.com/json/collection/v2.<minor>...`)
 * - `unknown`   : anything we don't translate (GraphQL SDL, plain text,
 *                 Swagger 1.x, OpenAPI 3.2+, malformed JSON/YAML, …)
 *
 * The detector is deliberately tolerant: it tries JSON first (Postman is
 * always JSON), then YAML CORE_SCHEMA, and falls back to `'unknown'` rather
 * than throwing. Conversion and strict validation happen downstream.
 */
import yaml from 'js-yaml';

export type SpecFormat = 'openapi3' | 'swagger2' | 'postman' | 'unknown';

const POSTMAN_SCHEMA_RE =
  /^https?:\/\/schema\.getpostman\.com\/json\/collection\/v2\.\d+/;

function safeLoad(raw: string): unknown {
  // JSON parses strict JSON; YAML CORE_SCHEMA also accepts strict JSON.
  // We try YAML directly — covers both cases — and swallow any error.
  try {
    return yaml.load(raw, { schema: yaml.CORE_SCHEMA });
  } catch {
    return null;
  }
}

export function detectFormat(raw: string): SpecFormat {
  if (!raw || typeof raw !== 'string') return 'unknown';

  const tree = safeLoad(raw);
  if (!tree || typeof tree !== 'object') return 'unknown';

  const root = tree as Record<string, unknown>;

  // OpenAPI 3.x — accept any 3.x flavour; strict version check stays in
  // parser.ts so we don't duplicate the policy.
  if (typeof root.openapi === 'string' && /^3\./.test(root.openapi)) {
    return 'openapi3';
  }

  // Swagger 2.0
  if (root.swagger === '2.0') return 'swagger2';

  // Postman Collection v2.x — `info.schema` is the only stable marker.
  const info = root.info as Record<string, unknown> | undefined;
  if (info && typeof info.schema === 'string' && POSTMAN_SCHEMA_RE.test(info.schema)) {
    return 'postman';
  }

  return 'unknown';
}

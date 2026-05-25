import yaml from 'js-yaml';
import SwaggerParser from '@apidevtools/swagger-parser';
import { ParseError, type ParsedSpec } from '@shared/types';
import { normalizeSpec } from './spec-normalizer';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB strict (R1.1.2)
const MAX_DEPTH = 20;                // Object/array depth ceiling (R1.1.6)
const PARSE_TIMEOUT_MS = 5_000;      // Hard timeout (R1.1.5)

export interface ParseSpecOptions {
  /** Original byte size of the upload, used to enforce R1.1.2 before any parsing. */
  sizeBytes: number;
  /** Override for tests. */
  timeoutMs?: number;
}

/**
 * Parses and normalises an OpenAPI 3.x spec.
 *
 * SLICE follows the "faithful translator" principle (SPEC §0): we run all
 * defensive checks (size, depth, timeout, ref scope) but we never rewrite
 * semantics. Anything we cannot vouch for is rejected with a typed error.
 *
 * Phase 02 supports OpenAPI 3.0.x and 3.1.x only.
 * Phase 03 will plug Swagger 2.0 and Postman v2 conversion in front of this.
 */
export async function parseSpec(
  raw: string,
  options: ParseSpecOptions
): Promise<ParsedSpec> {
  if (options.sizeBytes > MAX_BYTES) {
    throw new ParseError(
      'PAYLOAD_TOO_LARGE',
      `File exceeds the 10 MB limit (${options.sizeBytes} bytes).`
    );
  }

  const tree = loadStructured(raw);
  assertVersion(tree);
  assertDepth(tree);

  const timeoutMs = options.timeoutMs ?? PARSE_TIMEOUT_MS;
  const validated = await withTimeout(SwaggerParser.validate(tree as object), timeoutMs);

  // R1.1.7 — at least one path is required to consider the spec usable.
  // `paths` may be missing for OpenAPI 3.1 specs that only define webhooks,
  // which we don't support (SLICE generates HTTP MCP tools, not webhook handlers).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paths = (validated as any).paths as Record<string, unknown> | undefined;
  if (!paths || Object.keys(paths).length === 0) {
    throw new ParseError('EMPTY_SPEC', 'No endpoints found in the spec.');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return normalizeSpec(validated as any);
}

function loadStructured(raw: string): unknown {
  let tree: unknown;
  try {
    // YAML loader handles strict JSON too — single safe path.
    tree = yaml.load(raw, {
      schema: yaml.FAILSAFE_SCHEMA, // disallow arbitrary tags (R1.1.4 — no YAML bombs)
    });
  } catch (err) {
    throw new ParseError(
      'INVALID_SPEC',
      `Could not parse the file: ${(err as Error).message}`
    );
  }

  if (tree == null || typeof tree !== 'object') {
    throw new ParseError('INVALID_SPEC', 'Spec must be a YAML or JSON object.');
  }

  return tree;
}

function assertVersion(tree: unknown): void {
  const root = tree as Record<string, unknown>;

  if (typeof root.swaggerVersion === 'string') {
    throw new ParseError(
      'UNSUPPORTED_VERSION',
      `Swagger ${root.swaggerVersion} is not supported. Please use OpenAPI 3.x.`
    );
  }

  if (root.swagger === '2.0') {
    // Phase 03 will swap this for an auto-conversion.
    throw new ParseError(
      'UNSUPPORTED_VERSION',
      'Swagger 2.0 detected. Conversion will be enabled in the next phase.'
    );
  }

  if (typeof root.openapi !== 'string' || !/^3\.[01](\.\d+)?$/.test(root.openapi)) {
    throw new ParseError(
      'UNSUPPORTED_VERSION',
      `Unsupported OpenAPI version ${String(root.openapi)}.`
    );
  }
}

function assertDepth(tree: unknown, current = 0): void {
  if (current > MAX_DEPTH) {
    throw new ParseError(
      'PARSE_DEPTH_EXCEEDED',
      `Spec is nested deeper than the ${MAX_DEPTH} level limit.`
    );
  }
  if (tree && typeof tree === 'object') {
    for (const value of Object.values(tree as Record<string, unknown>)) {
      assertDepth(value, current + 1);
    }
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new ParseError('PARSE_TIMEOUT', `Parsing took longer than ${ms} ms.`)),
      ms
    );
  });

  try {
    const result = await Promise.race([promise, timeout]);
    return result as T;
  } catch (err) {
    if (err instanceof ParseError) throw err;
    throw new ParseError('INVALID_SPEC', (err as Error).message);
  } finally {
    clearTimeout(timer!);
  }
}

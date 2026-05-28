import yaml from 'js-yaml';
import SwaggerParser from '@apidevtools/swagger-parser';
import { ParseError, type ParsedSpec } from '@shared/types';
import { convertToOpenAPI3 } from './format-converter';
import { normalizeSpec } from './spec-normalizer';
import { sanitizeSpec } from './spec-sanitizer';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB strict (R1.1.2)
// SPEC R1.1.6 originally specified a depth ceiling (initially 20, raised to 50)
// to bound recursive descent. After real-world testing (Stripe, GitHub, .NET
// enterprise specs), we found legitimate deep schemas constantly tripped it
// while CORE_SCHEMA already prevents YAML-bomb expansion (no anchors) and
// MAX_NODES caps the total work. The depth guard was a false-positive factory
// with no incremental security benefit, so it's been dropped. MAX_NODES is
// the canonical anti-DoS bound now.
const MAX_NODES = 200_000;           // Total nodes visited — bounds fanout DoS (R1.1.6)
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
 * Accepts OpenAPI 3.x natively. Swagger 2.0 and Postman Collection v2 are
 * auto-converted (phase 03) before the rest of the pipeline runs — the
 * conversion is silent to the caller (SPEC R1.1.3).
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

  const timeoutMs = options.timeoutMs ?? PARSE_TIMEOUT_MS;
  // The entire pipeline (conversion + structural checks + validation) is
  // wrapped in a single timeout. Doing the conversion outside the envelope
  // would create a DoS window: a pathological Postman collection or a
  // combinatorial Swagger 2.0 doc could keep the event loop busy for tens
  // of seconds before the parser ever ran. R1.1.5 promises 5 s total.
  return withTimeout(runPipeline(raw), timeoutMs);
}

async function runPipeline(raw: string): Promise<ParsedSpec> {
  // Defence in depth — scan the user's *original* tree for external $refs
  // before handing the doc to swagger2openapi / postman-to-openapi. The
  // converters are configured `fetch: false, resolve: false` and the
  // post-conversion `assertNoExternalRefs` re-checks the output, but
  // scanning the raw input too removes any dependency on what either
  // upstream does with malicious refs.
  const rawTree = tryLoadStructured(raw);
  if (rawTree && typeof rawTree === 'object') {
    assertNoExternalRefs(rawTree);
  }

  // Phase 03 — auto-convert Swagger 2.0 / Postman v2 → OpenAPI 3 string.
  // OpenAPI 3.x is returned verbatim; `convertToOpenAPI3` throws typed
  // ParseErrors which we let bubble up to the route handler.
  const openapiRaw = await convertToOpenAPI3(raw);

  const tree = loadStructured(openapiRaw);
  assertVersion(tree);
  assertSize(tree);
  assertNoExternalRefs(tree);
  // Narrow, non-semantic orthographic fixes (e.g. Swashbuckle's `scheme:
  // Bearer` → `scheme: bearer`) so the downstream validator doesn't reject
  // specs over IANA-constant casing. See `spec-sanitizer.ts` for the why.
  const sanitised = sanitizeSpec(tree);

  // SwaggerParser.validate accepts an in-memory object at runtime but its
  // type definitions only list `string | Document`. Casting keeps the
  // runtime contract while satisfying tsc.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validated = await SwaggerParser.validate(sanitised as any);

  // Phase 04 task 12.a — reject specs that REQUIRE auth schemes we don't
  // generate code for yet (MVP supports none / apiKey / http+bearer only).
  // OAuth2, OpenID Connect, http+basic, http+digest are all explicitly
  // declared post-MVP in the PRD. We only flag schemes that are actually
  // referenced by an endpoint's `security` (or the root `security`) — a
  // legacy scheme declared in `components.securitySchemes` but never used
  // is fine.
  assertSupportedAuth(validated);

  // R1.1.7 — at least one path is required to consider the spec usable.
  // `paths` may be missing for OpenAPI 3.1 specs that only define webhooks,
  // which we don't support (SLICE generates HTTP MCP tools, not webhook handlers).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paths = (validated as any).paths as Record<string, unknown> | undefined;
  if (!paths || Object.keys(paths).length === 0) {
    throw new ParseError('EMPTY_SPEC', 'No endpoints found in the API description.');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return normalizeSpec(validated as any);
}

/**
 * Best-effort YAML/JSON load that swallows errors. Used to pre-scan the
 * original input for external $refs before we hand it to a converter; we
 * don't want to throw INVALID_SPEC for inputs that the converter knows how
 * to handle (Postman v2 isn't strict YAML/JSON-compat in places).
 */
function tryLoadStructured(raw: string): unknown {
  try {
    return yaml.load(raw, { schema: yaml.CORE_SCHEMA });
  } catch {
    return undefined;
  }
}

function loadStructured(raw: string): unknown {
  let tree: unknown;
  try {
    // YAML loader handles strict JSON too — single safe path.
    // CORE_SCHEMA = JSON-compatible types (str/seq/map + bool/int/float/null)
    // without any custom tag resolver. It blocks the YAML-bomb / RCE vectors
    // (`!!js/function`, `!!binary`, `!Date`, anchors-as-code) while still
    // letting OpenAPI booleans / integers parse as their native types — which
    // SwaggerParser's JSON schema validator requires (a `required: true`
    // would otherwise be stringified by FAILSAFE_SCHEMA and rejected as
    // "must be boolean").
    tree = yaml.load(raw, { schema: yaml.CORE_SCHEMA }); // R1.1.4
  } catch (err) {
    throw new ParseError(
      'INVALID_SPEC',
      `Could not parse the file: ${(err as Error).message}`
    );
  }

  if (tree == null || typeof tree !== 'object') {
    throw new ParseError('INVALID_SPEC', 'The API description must be a YAML or JSON object.');
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

  if (root.openapi === undefined) {
    // No version marker at all → not an OpenAPI document we can recognise.
    throw new ParseError(
      'INVALID_SPEC',
      'Could not detect an OpenAPI version. The file does not look like an API description.'
    );
  }

  if (typeof root.openapi !== 'string' || !/^3\.[01](\.\d+)?$/.test(root.openapi)) {
    throw new ParseError(
      'UNSUPPORTED_VERSION',
      `Unsupported OpenAPI version ${String(root.openapi)}.`
    );
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function assertSupportedAuth(doc: any): void {
  const schemes: Record<string, any> = doc?.components?.securitySchemes ?? {};
  if (Object.keys(schemes).length === 0) return;

  // Collect every scheme name that is actually required by an endpoint.
  // OpenAPI's security model is an array of requirement objects, each whose
  // keys reference scheme names. A root-level `security` applies as a
  // default; operation-level `security` (including an empty array `[]`)
  // overrides it.
  const referenced = new Set<string>();
  const rootSecurity: any[] = Array.isArray(doc?.security) ? doc.security : [];

  for (const item of rootSecurity) {
    if (item && typeof item === 'object') {
      for (const name of Object.keys(item)) referenced.add(name);
    }
  }

  const paths: Record<string, any> = doc?.paths ?? {};
  const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];
  for (const pathItem of Object.values(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (!op || typeof op !== 'object') continue;
      const opSecurity = Array.isArray(op.security) ? op.security : null;
      if (opSecurity === null) continue; // falls back to root, already counted
      for (const item of opSecurity) {
        if (item && typeof item === 'object') {
          for (const name of Object.keys(item)) referenced.add(name);
        }
      }
    }
  }

  // OpenAPI security entries are OR'd — an endpoint that lists `[bearer,
  // basic]` accepts either. So we only fail the whole spec when *every*
  // referenced scheme is unsupported; otherwise we let the auth-detector
  // pick the supported one and move on. This matches real-world specs like
  // Notion that ship `basicAuth` alongside `bearerAuth` for historical
  // reasons (10.2 hotfix).
  let supportedFound = false;
  let firstUnsupported: { name: string; reason: string } | null = null;

  for (const name of referenced) {
    const scheme = schemes[name];
    if (!scheme) continue;
    const type = String(scheme.type ?? '').toLowerCase();
    const httpScheme = String(scheme.scheme ?? '').toLowerCase();

    if (type === 'apikey' || (type === 'http' && httpScheme === 'bearer')) {
      supportedFound = true;
      continue;
    }

    let reason: string | null = null;
    if (type === 'oauth2') {
      reason = `Auth scheme "${name}" uses OAuth2, which SLICE does not generate MCP code for yet. Re-export your API description with API Key or Bearer auth, or wait for V1.5.`;
    } else if (type === 'openidconnect') {
      reason = `Auth scheme "${name}" uses OpenID Connect, which SLICE does not generate MCP code for yet.`;
    } else if (type === 'http' && (httpScheme === 'basic' || httpScheme === 'digest')) {
      reason = `Auth scheme "${name}" uses HTTP ${httpScheme}, which SLICE does not generate MCP code for yet. Use Bearer or API Key instead.`;
    }

    if (reason && !firstUnsupported) {
      firstUnsupported = { name, reason };
    }
  }

  if (!supportedFound && firstUnsupported) {
    throw new ParseError('UNSUPPORTED_AUTH', firstUnsupported.reason);
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function assertSize(tree: unknown): void {
  // Bounds the total amount of work the downstream pipeline will see. A spec
  // that's flat-but-wide (50k keys per object) or just very large needs to be
  // rejected before SwaggerParser.validate amplifies it. Depth itself is no
  // longer checked — see the MAX_NODES comment up top.
  const counter = { nodes: 0 };
  walk(tree, counter);
}

function walk(tree: unknown, counter: { nodes: number }): void {
  if (!tree || typeof tree !== 'object') return;
  for (const value of Object.values(tree as Record<string, unknown>)) {
    counter.nodes += 1;
    if (counter.nodes > MAX_NODES) {
      throw new ParseError(
        'PARSE_DEPTH_EXCEEDED',
        `The API description contains more than ${MAX_NODES} nodes — refusing to parse.`
      );
    }
    walk(value, counter);
  }
}

/**
 * Walks the raw YAML tree and rejects any `$ref` that points outside the
 * document itself. Only intra-document refs (`#/components/...`) are allowed.
 *
 * SwaggerParser would otherwise happily resolve `http://`, `https://` and
 * `file://` refs at validate time, which is a textbook SSRF / LFI primitive
 * once SLICE is deployed (the AWS metadata endpoint `169.254.169.254` is the
 * canonical example). Doing the check on the YAML tree, before we hand the
 * doc to SwaggerParser, also protects us if the upstream library's resolver
 * defaults change.
 */
function assertNoExternalRefs(tree: unknown, seen = new WeakSet<object>()): void {
  if (!tree || typeof tree !== 'object') return;
  if (seen.has(tree as object)) return; // cycle guard — YAML FAILSAFE blocks anchors but we stay defensive
  seen.add(tree as object);

  for (const [key, value] of Object.entries(tree as Record<string, unknown>)) {
    if (key === '$ref' && typeof value === 'string') {
      const ref = value.trim();
      // Allow only intra-document refs that start with `#`.
      if (!ref.startsWith('#')) {
        throw new ParseError(
          'INVALID_SPEC',
          `External $ref are not allowed for security reasons: ${ref}`
        );
      }
    } else if (value && typeof value === 'object') {
      assertNoExternalRefs(value, seen);
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
    const message = err instanceof Error ? err.message : String(err);
    throw new ParseError('INVALID_SPEC', summariseValidatorMessage(message));
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * SwaggerParser concatenates every JSON-schema violation into one multi-line
 * message that can be hundreds of lines long — unusable in a toast. Keep the
 * headline (first line) and trim the rest. Callers who need full diagnostics
 * can drop down to the validator directly.
 */
function summariseValidatorMessage(raw: string): string {
  const firstLine = raw.split('\n')[0]?.trim() ?? raw;
  const MAX_LEN = 250;
  return firstLine.length > MAX_LEN ? `${firstLine.slice(0, MAX_LEN - 1)}…` : firstLine;
}

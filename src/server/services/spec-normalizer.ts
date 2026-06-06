/**
 * Spec normalizer — converts a validated OpenAPI document into the internal
 * ParsedSpec shape used by the client. Phase 02 implements R1.2.2 / R1.2.3,
 * method exclusions and parameter flattening (SPEC §1.2 + cas limites).
 */
import type {
  ApproximationKind,
  DefaultConfig,
  Endpoint,
  EndpointGroup,
  EndpointParam,
  HttpMethod,
  ParsedSpec,
} from '@shared/types';
import { collectReferencedSchemeNames, detectAuth } from './auth-detector';
import { slugify } from './slug';
import { generateMcpServerToken } from './token-generator';
import { toZodShape } from './zod-schema-builder';

/* eslint-disable @typescript-eslint/no-explicit-any */

const RECOGNIZED_SCHEMA_TYPES = new Set([
  'string', 'integer', 'number', 'boolean', 'array', 'object',
]);

function hasComplexSchema(schema: any): boolean {
  if (!schema || typeof schema !== 'object') return false;
  if (schema.oneOf != null || schema.anyOf != null || schema.allOf != null) return true;
  return typeof schema.type === 'string' && !RECOGNIZED_SCHEMA_TYPES.has(schema.type);
}

const SUPPORTED_METHODS: ReadonlyArray<string> = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
];

export function normalizeSpec(doc: any): ParsedSpec {
  const { groups, excludedCount } = collectGroups(doc);
  const baseUrl = doc?.servers?.[0]?.url ?? '';
  const apiName = doc?.info?.title ?? 'Untitled API';

  // Phase 06 — pre-fill the config screen with everything we can deduce.
  // The detector falls back to `{ type: 'none' }` safely if the spec has
  // no `securitySchemes` block. We pass the referenced-schemes set (so a
  // declared-but-unused scheme isn't imposed) and baseUrl (to resolve a
  // relative OAuth2 tokenUrl) — phase OAuth-1a.
  const upstreamAuth = detectAuth(doc?.components?.securitySchemes ?? null, {
    referenced: collectReferencedSchemeNames(doc),
    baseUrl,
  });
  const defaultConfig: DefaultConfig = {
    mcpName: slugify(doc?.info?.title ?? ''),
    baseUrl,
    upstreamAuth,
    mcpServerToken: generateMcpServerToken(),
  };

  return {
    apiName,
    apiVersion: doc?.info?.version ?? '0.0.0',
    baseUrl,
    authType: upstreamAuth.type,
    authHeader: upstreamAuth.headerName,
    groups,
    excludedCount,
    defaultConfig,
  };
}

/**
 * Phase 04 task 12.b — an endpoint with no operationId, no summary, and no
 * usable description (empty / whitespace) would generate a meaningless MCP
 * tool name and an LLM-useless description. We drop it from the parsed
 * spec and surface a counter so the user knows what happened.
 *
 * "Usable" = string, non-empty after trim. We don't try to assess content
 * quality — that's V1.1.
 */
function hasUsableMetadata(op: any): boolean {
  const opId = typeof op.operationId === 'string' && op.operationId.trim().length > 0;
  const summary = typeof op.summary === 'string' && op.summary.trim().length > 0;
  const description = typeof op.description === 'string' && op.description.trim().length > 0;
  return opId || summary || description;
}

function collectGroups(doc: any): { groups: EndpointGroup[]; excludedCount: number } {
  const byTag = new Map<string, Endpoint[]>();
  const paths = doc?.paths ?? {};
  let excludedCount = 0;

  for (const [pathKey, pathItem] of Object.entries<Record<string, any>>(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    const pathLevelParams = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];

    for (const method of SUPPORTED_METHODS) {
      const op = pathItem[method];
      if (!op || typeof op !== 'object') continue;

      if (!hasUsableMetadata(op)) {
        excludedCount += 1;
        continue;
      }

      const upperMethod = method.toUpperCase() as HttpMethod;
      const tag: string = op.tags?.[0] ?? 'Other';
      const label = pickLabel(op, upperMethod, pathKey);
      const params = mergeParams(pathLevelParams, op.parameters);
      // Flatten a JSON requestBody into in:'body' params (reassembled into the
      // request body at call time). Field names that collide with an existing
      // param are disambiguated; the real wire name is kept in `wireName`.
      const existingNames = new Set(params.map((p) => p.name));
      const bodyParams = flattenRequestBody(op.requestBody, existingNames);
      params.push(...bodyParams);

      const approximations: ApproximationKind[] = [];

      if (op.requestBody != null && bodyParams.length === 0) {
        approximations.push('non_json_body');
      }

      if (params.some((p) => p.in === 'cookie')) {
        approximations.push('cookie_param');
      }

      const rawParams = [...pathLevelParams, ...(Array.isArray(op.parameters) ? op.parameters : [])];
      const rawBodySchema = op.requestBody?.content?.['application/json']?.schema;
      const bodyPropSchemas =
        rawBodySchema?.type === 'object' && rawBodySchema?.properties
          ? Object.values(rawBodySchema.properties as Record<string, any>)
          : [];
      if (
        rawParams.some((p: any) => p?.in !== 'cookie' && hasComplexSchema(p?.schema)) ||
        (bodyParams.length > 0 &&
          (hasComplexSchema(rawBodySchema) || bodyPropSchemas.some(hasComplexSchema)))
      ) {
        approximations.push('schema_fallback');
      }

      const endpoint: Endpoint = {
        id: `${upperMethod} ${pathKey}`,
        method: upperMethod,
        path: pathKey,
        label,
        description: typeof op.description === 'string' ? op.description : undefined,
        params,
        ...(op.deprecated === true ? { deprecated: true } : {}),
        ...(approximations.length > 0 ? { approximations } : {}),
      };

      const bucket = byTag.get(tag) ?? [];
      bucket.push(endpoint);
      byTag.set(tag, bucket);
    }
  }

  return {
    groups: Array.from(byTag.entries()).map(([tag, endpoints]) => ({ tag, endpoints })),
    excludedCount,
  };
}

function pickLabel(op: any, method: HttpMethod, pathKey: string): string {
  if (typeof op.summary === 'string' && op.summary.trim().length > 0) {
    return op.summary.trim();
  }
  if (typeof op.description === 'string' && op.description.trim().length > 0) {
    return firstLine(op.description);
  }
  return defaultLabel(method, pathKey);
}

function firstLine(text: string): string {
  return text.split(/\r?\n/)[0]?.trim() ?? text;
}

function defaultLabel(method: HttpMethod, pathKey: string): string {
  // Drop empty segments and OpenAPI path-params like `{id}` so the resource
  // noun stays meaningful (`/customers/{id}` → "customers", not "{id}").
  const noun =
    pathKey
      .split('/')
      .filter((seg) => seg.length > 0 && !/^\{.*\}$/.test(seg))
      .pop() ?? 'resource';
  switch (method) {
    case 'GET':
      return `List ${noun}`;
    case 'POST':
      return `Create a ${noun}`;
    case 'PUT':
    case 'PATCH':
      return `Update a ${noun}`;
    case 'DELETE':
      return `Delete a ${noun}`;
  }
}

function mergeParams(pathLevel: any[], opLevel: unknown): EndpointParam[] {
  const opParams = Array.isArray(opLevel) ? opLevel : [];
  // Operation-level params override path-level params of the same (name, in).
  const merged = new Map<string, EndpointParam>();
  for (const raw of [...pathLevel, ...opParams]) {
    const normalised = normaliseParam(raw);
    if (!normalised) continue;
    merged.set(`${normalised.in}:${normalised.name}`, normalised);
  }
  return Array.from(merged.values());
}

/**
 * Flatten an operation's JSON `requestBody` into `in:'body'` params.
 *
 * - Object body with declared properties → one param per top-level property
 *   (`wireName` = the real field name; `name` disambiguated on collision).
 * - Any other body (array, scalar, free-form object) → a single fallback `body`
 *   param carrying the whole schema, marked by the ABSENCE of `wireName`.
 * - Non-JSON content (multipart, etc.) → no body params (MVP limit).
 */
function flattenRequestBody(requestBody: any, existingNames: Set<string>): EndpointParam[] {
  const schema = requestBody?.content?.['application/json']?.schema;
  if (!schema || typeof schema !== 'object') return [];
  const shape = toZodShape(schema);

  if (shape.type === 'object' && shape.properties && Object.keys(shape.properties).length > 0) {
    const requiredSet = new Set(shape.requiredFields ?? []);
    return Object.entries(shape.properties).map(([propName, propShape]) => {
      const name = existingNames.has(propName) ? `${propName}_body` : propName;
      const param: EndpointParam = {
        name,
        in: 'body',
        required: requiredSet.has(propName),
        wireName: propName,
        schema: propShape,
      };
      if (propShape.type) param.type = propShape.type;
      if (propShape.description) param.description = propShape.description;
      return param;
    });
  }

  // Fallback: the whole body is a single value (no wireName).
  const param: EndpointParam = {
    name: existingNames.has('body') ? 'requestBody' : 'body',
    in: 'body',
    required: requestBody.required === true,
    schema: shape,
  };
  if (shape.type) param.type = shape.type;
  return [param];
}

function normaliseParam(raw: any): EndpointParam | null {
  if (!raw || typeof raw !== 'object' || typeof raw.name !== 'string') return null;
  const location = raw.in === 'path' || raw.in === 'header' || raw.in === 'cookie' ? raw.in : 'query';
  return {
    name: raw.name,
    in: location,
    type: typeof raw.schema?.type === 'string' ? raw.schema.type : undefined,
    required: raw.required === true || raw.in === 'path', // path params are always required (OpenAPI rule)
    description: typeof raw.description === 'string' ? raw.description : undefined,
  };
}

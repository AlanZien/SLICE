/**
 * Spec normalizer — converts a validated OpenAPI document into the internal
 * ParsedSpec shape used by the client. Phase 02 implements R1.2.2 / R1.2.3,
 * method exclusions and parameter flattening (SPEC §1.2 + cas limites).
 */
import type {
  Endpoint,
  EndpointGroup,
  EndpointParam,
  HttpMethod,
  ParsedSpec,
} from '@shared/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

const SUPPORTED_METHODS: ReadonlyArray<string> = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
];

export function normalizeSpec(doc: any): ParsedSpec {
  return {
    apiName: doc?.info?.title ?? 'Untitled API',
    apiVersion: doc?.info?.version ?? '0.0.0',
    baseUrl: doc?.servers?.[0]?.url ?? '',
    authType: 'none',
    groups: collectGroups(doc),
  };
}

function collectGroups(doc: any): EndpointGroup[] {
  const byTag = new Map<string, Endpoint[]>();
  const paths = doc?.paths ?? {};

  for (const [pathKey, pathItem] of Object.entries<Record<string, any>>(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    const pathLevelParams = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];

    for (const method of SUPPORTED_METHODS) {
      const op = pathItem[method];
      if (!op || typeof op !== 'object') continue;

      const upperMethod = method.toUpperCase() as HttpMethod;
      const tag: string = op.tags?.[0] ?? 'Autres';
      const label = pickLabel(op, upperMethod, pathKey);
      const params = mergeParams(pathLevelParams, op.parameters);

      const endpoint: Endpoint = {
        id: `${upperMethod} ${pathKey}`,
        method: upperMethod,
        path: pathKey,
        label,
        description: typeof op.description === 'string' ? op.description : undefined,
        params,
      };

      const bucket = byTag.get(tag) ?? [];
      bucket.push(endpoint);
      byTag.set(tag, bucket);
    }
  }

  return Array.from(byTag.entries()).map(([tag, endpoints]) => ({ tag, endpoints }));
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
      return `Lister les ${noun}`;
    case 'POST':
      return `Créer un ${noun}`;
    case 'PUT':
    case 'PATCH':
      return `Modifier un ${noun}`;
    case 'DELETE':
      return `Supprimer un ${noun}`;
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

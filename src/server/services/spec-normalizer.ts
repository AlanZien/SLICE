/**
 * Spec normalizer — converts a validated OpenAPI document into the internal
 * ParsedSpec shape used by the client.
 *
 * Phase 02 — minimal happy-path implementation. Full label/tag/method rules
 * (R1.2.2 / R1.2.3 / R1.2.4 / exclusions) land in the next TDD cycle.
 */
import type { Endpoint, EndpointGroup, HttpMethod, ParsedSpec } from '@shared/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

const SUPPORTED_METHODS: ReadonlyArray<string> = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
];

export function normalizeSpec(doc: any): ParsedSpec {
  const apiName: string = doc?.info?.title ?? 'Untitled API';
  const apiVersion: string = doc?.info?.version ?? '0.0.0';
  const baseUrl: string = doc?.servers?.[0]?.url ?? '';

  const groups = collectGroups(doc);

  return {
    apiName,
    apiVersion,
    baseUrl,
    authType: 'none',
    groups,
  };
}

function collectGroups(doc: any): EndpointGroup[] {
  const byTag = new Map<string, Endpoint[]>();
  const paths = doc?.paths ?? {};

  for (const [pathKey, pathItem] of Object.entries<Record<string, any>>(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;

    for (const method of SUPPORTED_METHODS) {
      const op = pathItem[method];
      if (!op || typeof op !== 'object') continue;

      const upperMethod = method.toUpperCase() as HttpMethod;
      const tag: string = op.tags?.[0] ?? 'Autres';
      const label: string =
        op.summary ??
        (typeof op.description === 'string' ? firstLine(op.description) : undefined) ??
        defaultLabel(upperMethod, pathKey);

      const endpoint: Endpoint = {
        id: `${upperMethod} ${pathKey}`,
        method: upperMethod,
        path: pathKey,
        label,
        description: typeof op.description === 'string' ? op.description : undefined,
        params: [],
      };

      const bucket = byTag.get(tag) ?? [];
      bucket.push(endpoint);
      byTag.set(tag, bucket);
    }
  }

  return Array.from(byTag.entries()).map(([tag, endpoints]) => ({ tag, endpoints }));
}

function firstLine(text: string): string {
  return text.split(/\r?\n/)[0]?.trim() ?? text;
}

function defaultLabel(method: HttpMethod, pathKey: string): string {
  const noun = pathKey.split('/').filter(Boolean).pop() ?? 'resource';
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

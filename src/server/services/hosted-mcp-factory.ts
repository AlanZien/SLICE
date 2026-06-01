/**
 * Core of SLICE's hosted runtime (Pivot-4) — the "shared engine".
 *
 * Given a stored config (a curated OpenAPI subset = the "fiche"), it builds an
 * `McpServer` in memory whose tools proxy to the upstream API, relaying the
 * caller's `Authorization` header (never storing a secret). One engine BECOMES
 * any MCP at request time, driven purely by the config. No code per client.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { z, type ZodTypeAny } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EndpointParam, HttpMethod, UpstreamAuth } from '@shared/types';
import { type ZodSchemaShape } from './zod-schema-builder';
import { assertPublicUrl } from './ssrf-guard';

/** Knobs for the hosted engine. `allowPrivateHosts` is for tests/dev only. */
export interface HostedMcpOptions {
  /** When false (the production default), the upstream host is SSRF-guarded. */
  allowPrivateHosts?: boolean;
}

/** One endpoint the hosted MCP exposes as a tool. */
export interface HostedEndpoint {
  name: string;
  description: string;
  method: HttpMethod;
  path: string;
  params: EndpointParam[];
}

/** The stored "fiche": everything the engine needs to serve one MCP. */
export interface HostedMcpConfig {
  name: string;
  baseUrl: string;
  upstreamAuth: UpstreamAuth;
  endpoints: HostedEndpoint[];
}

/**
 * Per-request relay context. The HTTP route wraps `handleRequest` in
 * `relayStore.run({ authorization }, …)`; tool handlers read the caller's
 * token from here, per request, without storing anything.
 */
export const relayStore = new AsyncLocalStorage<{ authorization: string }>();

/**
 * The bearer token the caller relayed, or `undefined` for a missing/malformed
 * header. Restricted to printable ASCII to close off header injection (same
 * rule as the generated kit, Pivot-3).
 */
export function relayedToken(): string | undefined {
  const raw = relayStore.getStore()?.authorization ?? '';
  const match = /^Bearer\s+([\x21-\x7e]+)\s*$/i.exec(raw.trim());
  return match?.[1];
}

/**
 * Build a real Zod schema from a (narrow) OpenAPI shape, at runtime. Kept in
 * behavioural lockstep with the kit's string builder (`buildZodExpression`):
 * objects `.passthrough()` so undeclared keys (free-form request bodies like
 * Notion page `properties`) survive instead of being stripped. Exported for
 * the parity test.
 */
export function buildZodSchema(shape: ZodSchemaShape): ZodTypeAny {
  let base: ZodTypeAny;
  switch ((shape.type ?? '').toLowerCase()) {
    case 'integer':
      base = z.number().int();
      break;
    case 'number':
      base = z.number();
      break;
    case 'boolean':
      base = z.boolean();
      break;
    case 'array':
      base = z.array(shape.items ? buildZodSchema({ ...shape.items, required: true }) : z.unknown());
      break;
    case 'object': {
      const props = shape.properties ?? {};
      const requiredSet = new Set(shape.requiredFields ?? []);
      const entries: Record<string, ZodTypeAny> = {};
      for (const [name, child] of Object.entries(props)) {
        entries[name] = buildZodSchema({ ...child, required: requiredSet.has(name) });
      }
      base = z.object(entries).passthrough();
      break;
    }
    default:
      base = z.string();
  }
  return shape.required === false ? base.optional() : base;
}

function shapeOfParam(p: EndpointParam): ZodSchemaShape {
  return { type: p.type, required: p.required, description: p.description };
}

/** Issue the upstream call for one tool invocation, relaying the caller token. */
async function callUpstream(
  config: HostedMcpConfig,
  endpoint: HostedEndpoint,
  args: Record<string, unknown>,
  allowPrivateHosts: boolean
): Promise<unknown> {
  // Defense in depth: re-check the host at request time, not just at config
  // creation. The caller controls neither host nor protocol here (both are
  // fixed in the stored config), but DNS for a hostname could have changed.
  if (!allowPrivateHosts) {
    await assertPublicUrl(config.baseUrl);
  }
  let path = endpoint.path;
  for (const p of endpoint.params.filter((x) => x.in === 'path')) {
    path = path.replace(`{${p.name}}`, encodeURIComponent(String(args[p.name])));
  }
  const search = new URLSearchParams();
  for (const p of endpoint.params.filter((x) => x.in === 'query')) {
    const value = args[p.name];
    if (value !== undefined && value !== null) search.append(p.name, String(value));
  }
  const qs = search.toString();
  const url = `${config.baseUrl}${path}${qs ? `?${qs}` : ''}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  // Forward `in: header` params the agent supplied (e.g. Notion-Version, which
  // the upstream requires on every call). Applied before the auth relay so a
  // header param can never clobber the relayed token.
  for (const p of endpoint.params.filter((x) => x.in === 'header')) {
    const value = args[p.name];
    if (value !== undefined && value !== null) headers[p.name] = String(value);
  }
  const token = relayedToken();
  if (token) {
    if (config.upstreamAuth.type === 'bearer') {
      headers.Authorization = `Bearer ${token}`;
    } else if (config.upstreamAuth.type === 'apiKey' && config.upstreamAuth.headerName) {
      headers[config.upstreamAuth.headerName] = token;
    }
  }

  const res = await fetch(url, { method: endpoint.method, headers });
  if (!res.ok) {
    throw new Error(`Upstream ${res.status} ${res.statusText}: ${await res.text()}`);
  }
  const ct = res.headers.get('content-type') ?? '';
  return ct.includes('application/json') ? res.json() : res.text();
}

/**
 * Build an in-memory MCP server from a config. Cheap object construction —
 * call it per session (and cache by id). The config drives everything; the
 * code below is identical for every MCP.
 */
export function buildHostedMcpServer(
  config: HostedMcpConfig,
  options: HostedMcpOptions = {}
): McpServer {
  const allowPrivateHosts = options.allowPrivateHosts ?? false;
  const server = new McpServer({ name: config.name, version: '0.1.0' });
  for (const endpoint of config.endpoints) {
    const shape: Record<string, ZodTypeAny> = {};
    for (const p of endpoint.params) {
      shape[p.name] = buildZodSchema(shapeOfParam(p));
    }
    server.tool(endpoint.name, endpoint.description, shape, async (args: Record<string, unknown>) => {
      const result = await callUpstream(config, endpoint, args, allowPrivateHosts);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    });
  }
  return server;
}

/**
 * In-memory store of hosted MCP configs (the "fiches"), keyed by an
 * unguessable id. The id (≥128 bits, CSPRNG) doubles as the access control
 * for the hosted MCP (`/m/:id`) — there is no secret stored here, only the
 * curated API shape. A durable KV/DB backend replaces this Map in hardening.
 */
import { randomBytes } from 'node:crypto';
import type { HostedMcpConfig } from './hosted-mcp-factory';

export interface HostedStore {
  /** Store a config, return its unguessable id. */
  put(config: HostedMcpConfig): string;
  /** Retrieve a config by id, or `undefined` if unknown. */
  get(id: string): HostedMcpConfig | undefined;
}

/** 16 random bytes → 22 url-safe base64 chars (~128 bits of entropy). */
function newId(): string {
  return randomBytes(16).toString('base64url');
}

export function createHostedStore(): HostedStore {
  const configs = new Map<string, HostedMcpConfig>();
  return {
    put(config) {
      const id = newId();
      configs.set(id, config);
      return id;
    },
    get(id) {
      return configs.get(id);
    },
  };
}

/** Process-wide store (single-instance MVP, cf. D003). */
export const hostedStore = createHostedStore();

import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { HostedMcpConfig } from './hosted-mcp-factory';

export interface HostedStore {
  /** Store a config (stamping `createdAt` when absent), return its unguessable id. */
  put(config: HostedMcpConfig): string;
  /** Retrieve a config by id, or `undefined` if unknown. */
  get(id: string): HostedMcpConfig | undefined;
  /** Remove a config by id (no-op if unknown). */
  delete(id: string): void;
}

/** 16 random bytes → 22 url-safe base64 chars (~128 bits of entropy). */
function newId(): string {
  return randomBytes(16).toString('base64url');
}

function stamped(config: HostedMcpConfig): HostedMcpConfig {
  return config.createdAt ? config : { ...config, createdAt: new Date().toISOString() };
}

export function createHostedStore(): HostedStore {
  const configs = new Map<string, HostedMcpConfig>();
  return {
    put(config) {
      const id = newId();
      configs.set(id, stamped(config));
      return id;
    },
    get(id) {
      return configs.get(id);
    },
    delete(id) {
      configs.delete(id);
    },
  };
}

/** File-backed store — survives restarts. Writes are synchronous (low-frequency). */
export function createFileHostedStore(filePath: string): HostedStore {
  mkdirSync(dirname(filePath), { recursive: true });

  let configs = new Map<string, HostedMcpConfig>();
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, HostedMcpConfig>;
    // Legacy records predate the expiry feature — stamp them at load so they
    // enter a normal TTL cycle instead of breaking or dying instantly.
    configs = new Map(Object.entries(data).map(([id, cfg]) => [id, stamped(cfg)]));
  } catch {
    // File absent or corrupt — start fresh
  }

  function persist(): void {
    writeFileSync(filePath, JSON.stringify(Object.fromEntries(configs)), 'utf-8');
  }

  return {
    put(config) {
      const id = newId();
      configs.set(id, stamped(config));
      persist();
      return id;
    },
    get(id) {
      return configs.get(id);
    },
    delete(id) {
      if (configs.delete(id)) persist();
    },
  };
}

/** Process-wide store — file-backed on VPS, path via SLICE_STORE_PATH env. */
export const hostedStore = createFileHostedStore(
  process.env.SLICE_STORE_PATH ?? './data/hosted.json'
);

import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
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

/** File-backed store — survives restarts. Writes are synchronous (low-frequency). */
export function createFileHostedStore(filePath: string): HostedStore {
  mkdirSync(dirname(filePath), { recursive: true });

  const configs = new Map<string, HostedMcpConfig>();
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, HostedMcpConfig>;
    for (const [id, cfg] of Object.entries(data)) configs.set(id, cfg);
  } catch {
    // File absent or corrupt — start fresh
  }

  function persist(): void {
    const data: Record<string, HostedMcpConfig> = {};
    for (const [id, cfg] of configs) data[id] = cfg;
    writeFileSync(filePath, JSON.stringify(data), 'utf-8');
  }

  return {
    put(config) {
      const id = newId();
      configs.set(id, config);
      persist();
      return id;
    },
    get(id) {
      return configs.get(id);
    },
  };
}

/** Process-wide store — file-backed on VPS, path via SLICE_STORE_PATH env. */
export const hostedStore = createFileHostedStore(
  process.env.SLICE_STORE_PATH ?? './data/hosted.json'
);

import { describe, it, expect, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHostedStore, createFileHostedStore } from './hosted-store';
import type { HostedMcpConfig } from './hosted-mcp-factory';

const config: HostedMcpConfig = {
  name: 'demo',
  baseUrl: 'https://api.example.com',
  upstreamAuth: { type: 'bearer' },
  endpoints: [{ name: 'ping', description: 'Ping', method: 'GET', path: '/ping', params: [] }],
};

describe('hosted store', () => {
  it('put returns an unguessable id (≥22 url-safe chars) and get retrieves the config', () => {
    const store = createHostedStore();
    const id = store.put(config);
    expect(id).toMatch(/^[A-Za-z0-9_-]{22,}$/);
    expect(store.get(id)).toEqual(config);
  });

  it('returns undefined for an unknown id', () => {
    const store = createHostedStore();
    expect(store.get('does-not-exist')).toBeUndefined();
  });

  it('generates a distinct id per put', () => {
    const store = createHostedStore();
    const a = store.put(config);
    const b = store.put(config);
    expect(a).not.toBe(b);
  });
});

describe('createFileHostedStore', () => {
  const dir = join(tmpdir(), 'slice-store-test');
  const filePath = join(dir, 'hosted.json');

  afterEach(() => {
    if (existsSync(dir)) rmSync(dir, { recursive: true });
  });

  it('creates the directory and file on first put', () => {
    const store = createFileHostedStore(filePath);
    store.put(config);
    expect(existsSync(filePath)).toBe(true);
  });

  it('persists across instances (simulates restart)', () => {
    const id = createFileHostedStore(filePath).put(config);
    const reloaded = createFileHostedStore(filePath);
    expect(reloaded.get(id)).toEqual(config);
  });

  it('returns undefined for unknown id', () => {
    const store = createFileHostedStore(filePath);
    expect(store.get('unknown')).toBeUndefined();
  });

  it('generates distinct ids per put', () => {
    const store = createFileHostedStore(filePath);
    expect(store.put(config)).not.toBe(store.put(config));
  });

  it('starts fresh when file is corrupted', () => {
    mkdirSync(dir, { recursive: true });
    require('node:fs').writeFileSync(filePath, 'NOT JSON', 'utf-8');
    const store = createFileHostedStore(filePath);
    expect(store.get('anything')).toBeUndefined();
  });
});

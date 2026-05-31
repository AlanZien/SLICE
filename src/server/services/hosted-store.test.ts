import { describe, it, expect } from 'vitest';
import { createHostedStore } from './hosted-store';
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

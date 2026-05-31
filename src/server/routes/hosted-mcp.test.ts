// E2E for the hosted runtime routes (Pivot-4): POST /api/host stores a config
// and returns a URL; /m/:id serves the MCP, multi-session (several agents in
// parallel), relaying each caller's own token to the upstream.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../app';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const SPEC = `openapi: 3.0.3
info: { title: Demo, version: "1.0" }
servers: [{ url: http://placeholder }]
paths:
  /things:
    get:
      operationId: listThings
      summary: List things
      responses: { '200': { description: ok } }
`;

let upstream: Server;
let upstreamUrl: string;
let received: Array<{ url: string; auth: string | undefined }> = [];
let app: Server;
let baseUrl: string;

beforeAll(async () => {
  upstream = createServer((req, res) => {
    received.push({ url: req.url ?? '', auth: req.headers.authorization });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  });
  await new Promise<void>((r) => upstream.listen(0, r));
  upstreamUrl = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`;

  app = createApp({ nodeEnv: 'test' }).listen(0);
  await new Promise<void>((r) => app.once('listening', r));
  baseUrl = `http://127.0.0.1:${(app.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((r) => (app ? app.close(() => r()) : r()));
  await new Promise<void>((r) => (upstream ? upstream.close(() => r()) : r()));
});

async function host(): Promise<string> {
  const res = await fetch(`${baseUrl}/api/host`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      parsedSpec: {},
      rawSpec: SPEC,
      selectedIds: ['GET /things'],
      config: {
        mcpName: 'demo',
        baseUrl: upstreamUrl,
        upstreamAuth: { type: 'bearer' },
        hosting: 'cloud',
        mode: 'remote',
        includeParamDescriptions: false,
        retryOnServerError: false,
      },
    }),
  });
  expect(res.status).toBe(200);
  const body = (await res.json()) as { id: string; url: string };
  expect(body.url).toContain('/m/');
  return body.url;
}

async function callListThings(url: string, token: string): Promise<void> {
  const client = new Client({ name: 'agent', version: '0.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  await client.connect(transport);
  await client.callTool({ name: 'list_things', arguments: {} });
  await client.close();
}

describe('hosted runtime routes', () => {
  it('hosts a config and serves it; two agents in parallel each relay their own token', async () => {
    received = [];
    const url = await host();

    await Promise.all([callListThings(url, 'TOKEN_A'), callListThings(url, 'TOKEN_B')]);

    const auths = received.map((r) => r.auth).sort();
    expect(received.every((r) => r.url === '/things')).toBe(true);
    expect(auths).toEqual(['Bearer TOKEN_A', 'Bearer TOKEN_B']);
  }, 20_000);

  it('returns 404 for an unknown id', async () => {
    const res = await fetch(`${baseUrl}/m/nope-unknown-id`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    });
    expect(res.status).toBe(404);
  });
});

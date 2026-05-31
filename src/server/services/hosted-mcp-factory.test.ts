// Core of the shared hosted runtime (Pivot-4): build an McpServer in-memory
// from a stored config, serve it, and relay the caller's token to the upstream
// — proving one engine can BE any MCP from data, at request time.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { buildHostedMcpServer, relayStore, type HostedMcpConfig } from './hosted-mcp-factory';

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const s = createServer();
    s.listen(0, () => {
      const p = (s.address() as { port: number }).port;
      s.close(() => resolve(p));
    });
  });
}

let upstream: Server;
let upstreamPort: number;
let received: Array<{ url: string; auth: string | undefined; version: string | undefined }> = [];
let mcpHttp: Server;
let mcpPort: number;
let client: Client;

beforeAll(async () => {
  upstreamPort = await freePort();
  upstream = createServer((req, res) => {
    received.push({
      url: req.url ?? '',
      auth: req.headers.authorization,
      version: req.headers['notion-version'] as string | undefined,
    });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, path: req.url }));
  });
  await new Promise<void>((r) => upstream.listen(upstreamPort, r));

  const config: HostedMcpConfig = {
    name: 'demo',
    baseUrl: `http://127.0.0.1:${upstreamPort}`,
    upstreamAuth: { type: 'bearer' },
    endpoints: [
      { name: 'list_things', description: 'List things', method: 'GET', path: '/things', params: [] },
      {
        name: 'get_thing',
        description: 'Get one thing',
        method: 'GET',
        path: '/things/{id}',
        params: [{ name: 'id', in: 'path', type: 'string', required: true }],
      },
      {
        name: 'whoami',
        description: 'Whoami — needs a required header param (Notion-Version style)',
        method: 'GET',
        path: '/users/me',
        params: [{ name: 'Notion-Version', in: 'header', type: 'string', required: true }],
      },
    ],
  };

  // The test upstream is a 127.0.0.1 mock — allow private hosts so the SSRF
  // guard doesn't block the loopback call under test.
  const server = buildHostedMcpServer(config, { allowPrivateHosts: true });
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });
  await server.connect(transport);
  mcpPort = await freePort();
  mcpHttp = createServer((req, res) => {
    const authorization = req.headers.authorization ?? '';
    relayStore.run({ authorization }, () => {
      void transport.handleRequest(req, res);
    });
  });
  await new Promise<void>((r) => mcpHttp.listen(mcpPort, r));

  client = new Client({ name: 'test', version: '0.0.0' });
  const t = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${mcpPort}/`), {
    requestInit: { headers: { Authorization: 'Bearer USERTOKEN' } },
  });
  await client.connect(t);
}, 20_000);

afterAll(async () => {
  await client?.close();
  await new Promise<void>((r) => (mcpHttp ? mcpHttp.close(() => r()) : r()));
  await new Promise<void>((r) => (upstream ? upstream.close(() => r()) : r()));
});

describe('buildHostedMcpServer — runtime MCP from config', () => {
  it('exposes one tool per endpoint in the config', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(['get_thing', 'list_things', 'whoami']);
  });

  it('proxies a tool call to the upstream, substituting path params and relaying the token', async () => {
    received = [];
    await client.callTool({ name: 'get_thing', arguments: { id: '42' } });
    const last = received.at(-1);
    expect(last?.url).toBe('/things/42');
    expect(last?.auth).toBe('Bearer USERTOKEN');
  });

  it('forwards `in: header` params to the upstream request headers (e.g. Notion-Version)', async () => {
    received = [];
    await client.callTool({ name: 'whoami', arguments: { 'Notion-Version': '2022-06-28' } });
    const last = received.at(-1);
    expect(last?.url).toBe('/users/me');
    expect(last?.version).toBe('2022-06-28');
    // Auth relay still wins — a header param must not clobber the token.
    expect(last?.auth).toBe('Bearer USERTOKEN');
  });
});

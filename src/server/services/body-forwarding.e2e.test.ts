// T7 — full-pipeline E2E for request-body forwarding: an OpenAPI doc with a
// JSON requestBody → normalizeSpec → specToHostedConfig → buildHostedMcpServer
// → a real MCP client call → the upstream receives the body INTACT, including a
// free-form object with dynamic keys (the Notion "properties" case that the
// passthrough fix exists for).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { SliceConfig } from '@shared/types';
import { normalizeSpec } from './spec-normalizer';
import { specToHostedConfig } from './spec-to-hosted-config';
import { buildHostedMcpServer, relayStore } from './hosted-mcp-factory';

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const s = createServer();
    s.listen(0, () => {
      const p = (s.address() as { port: number }).port;
      s.close(() => resolve(p));
    });
  });
}

const DOC = (baseUrl: string) => ({
  openapi: '3.0.3',
  info: { title: 'Notion-like', version: '1' },
  servers: [{ url: baseUrl }],
  paths: {
    '/v1/pages': {
      post: {
        summary: 'Create a page',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  parent: { type: 'object', properties: { database_id: { type: 'string' } } },
                  // free-form: dynamic property keys, no fixed `properties`.
                  properties: { type: 'object', additionalProperties: true },
                },
                required: ['parent', 'properties'],
              },
            },
          },
        },
        responses: { '200': { description: 'ok' } },
      },
    },
  },
});

let upstream: Server;
let received: unknown[] = [];
let mcpHttp: Server;
let client: Client;

beforeAll(async () => {
  const upstreamPort = await freePort();
  upstream = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c as Buffer));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      received.push(raw.length > 0 ? JSON.parse(raw) : undefined);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  await new Promise<void>((r) => upstream.listen(upstreamPort, r));
  const baseUrl = `http://127.0.0.1:${upstreamPort}`;

  const parsed = normalizeSpec(DOC(baseUrl));
  const sliceConfig: SliceConfig = {
    mcpName: 'notion-like',
    baseUrl,
    upstreamAuth: { type: 'bearer' },
    mode: 'remote',
    includeParamDescriptions: false,
    retryOnServerError: false,
  };
  const config = specToHostedConfig(parsed, ['POST /v1/pages'], sliceConfig);
  const server = buildHostedMcpServer(config, { allowPrivateHosts: true });
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });
  await server.connect(transport);

  const mcpPort = await freePort();
  mcpHttp = createServer((req, res) => {
    relayStore.run({ authorization: req.headers.authorization ?? '' }, () => {
      void transport.handleRequest(req, res);
    });
  });
  await new Promise<void>((r) => mcpHttp.listen(mcpPort, r));

  client = new Client({ name: 'e2e', version: '0.0.0' });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${mcpPort}/`), {
      requestInit: { headers: { Authorization: 'Bearer TOKEN' } },
    })
  );
}, 20_000);

afterAll(async () => {
  await client?.close();
  await new Promise<void>((r) => (mcpHttp ? mcpHttp.close(() => r()) : r()));
  await new Promise<void>((r) => (upstream ? upstream.close(() => r()) : r()));
});

describe('request body forwarding — full pipeline E2E', () => {
  it('exposes the body fields as flat tool args', async () => {
    const { tools } = await client.listTools();
    const page = tools.find((t) => t.name === 'create_a_page')!;
    const keys = Object.keys((page.inputSchema as { properties?: object }).properties ?? {});
    expect(keys).toEqual(expect.arrayContaining(['parent', 'properties']));
  });

  it('forwards a free-form object body with dynamic keys INTACT (passthrough)', async () => {
    received = [];
    await client.callTool({
      name: 'create_a_page',
      arguments: {
        parent: { database_id: 'db_123' },
        properties: {
          Name: { title: [{ text: { content: 'Hello' } }] },
          'Custom Field': { number: 7 },
        },
      },
    });
    expect(received.at(-1)).toEqual({
      parent: { database_id: 'db_123' },
      properties: {
        Name: { title: [{ text: { content: 'Hello' } }] },
        'Custom Field': { number: 7 },
      },
    });
  });
});

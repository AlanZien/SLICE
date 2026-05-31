// Regression guard for the relay mechanism (Pivot-3 / OQ-3): the generated MCP
// relies on AsyncLocalStorage surviving the trip through
// StreamableHTTPServerTransport.handleRequest() into the tool handler. If a
// future @modelcontextprotocol/sdk bump breaks that propagation, relay mode
// would silently stop forwarding the caller's token — this test catches it.
// See .workflow/SPIKE-LOG.md (2026-05-31).
import { describe, it, expect } from 'vitest';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

describe('relay mechanism — ALS threading through MCP SDK', () => {
  it('the tool handler sees the request Authorization captured by als.run', async () => {
    const als = new AsyncLocalStorage<{ auth: string }>();
    let seenByTool: string | undefined = '__unset__';

    const server = new McpServer({ name: 'spike', version: '0.0.0' });
    server.tool('peek', 'peek the relayed auth', {}, async () => {
      seenByTool = als.getStore()?.auth;
      return { content: [{ type: 'text', text: seenByTool ?? 'NONE' }] };
    });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });
    await server.connect(transport);

    const http: Server = createServer((req, res) => {
      const auth = req.headers.authorization ?? '';
      als.run({ auth }, () => {
        void transport.handleRequest(req, res);
      });
    });
    await new Promise<void>((resolve) => http.listen(0, resolve));
    const port = (http.address() as { port: number }).port;

    const client = new Client({ name: 'spike-client', version: '0.0.0' });
    const clientTransport = new StreamableHTTPClientTransport(
      new URL(`http://localhost:${port}/`),
      { requestInit: { headers: { Authorization: 'Bearer SPIKE-TOKEN' } } }
    );
    await client.connect(clientTransport);
    await client.callTool({ name: 'peek', arguments: {} });

    await client.close();
    await new Promise<void>((resolve) => http.close(() => resolve()));

    expect(seenByTool).toBe('Bearer SPIKE-TOKEN');
  });
});

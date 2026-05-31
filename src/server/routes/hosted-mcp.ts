/**
 * Pivot-4 — the hosted runtime endpoint: `ALL /m/:id`.
 *
 * Looks up the stored config by id, builds an `McpServer` on demand
 * (`buildHostedMcpServer`), and serves it in **stateless** mode — a fresh
 * transport per request, so any number of agents can hit any number of MCPs
 * concurrently with no shared session state. The incoming `Authorization`
 * header is captured per request and relayed to the upstream; nothing stored.
 */
import { Router } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { buildHostedMcpServer, relayStore } from '../services/hosted-mcp-factory';
import { hostedStore } from '../services/hosted-store';

export interface HostedMcpRouterOptions {
  /** Forwarded to the engine — disables the SSRF guard (tests/dev only). */
  allowPrivateHosts?: boolean;
}

export function createHostedMcpRouter(options: HostedMcpRouterOptions = {}): Router {
  const router = Router();

  router.all('/:id', async (req, res) => {
    const config = hostedStore.get(req.params.id);
    if (!config) {
      res.status(404).json({ error: 'Unknown MCP id.' });
      return;
    }

    const server = buildHostedMcpServer(config, {
      allowPrivateHosts: options.allowPrivateHosts,
    });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      const authorization = req.headers.authorization ?? '';
      await relayStore.run({ authorization }, async () => {
        await transport.handleRequest(req, res, req.body);
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[hosted-mcp] request failed:', err instanceof Error ? err.stack : err);
      if (!res.headersSent) res.status(500).json({ error: 'Internal error.' });
    }
  });

  return router;
}

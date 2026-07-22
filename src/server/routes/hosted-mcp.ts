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
  /** Free-tier TTL in hours; 0 disables expiry. Defaults to SLICE_HOSTED_TTL_HOURS or 72. */
  ttlHours?: number;
}

/** Env-resolved default TTL (hours). `0` disables expiry (self-host deployments). */
export function defaultTtlHours(): number {
  const parsed = Number(process.env.SLICE_HOSTED_TTL_HOURS ?? '72');
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 72;
}

export function isExpired(createdAt: string | undefined, ttlHours: number, now = Date.now()): boolean {
  if (ttlHours <= 0 || !createdAt) return false;
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return false;
  return now - created > ttlHours * 3_600_000;
}

export function createHostedMcpRouter(options: HostedMcpRouterOptions = {}): Router {
  const router = Router();
  const ttlHours = options.ttlHours ?? defaultTtlHours();

  router.all('/:id', async (req, res) => {
    const config = hostedStore.get(req.params.id);
    if (!config) {
      res.status(404).json({ error: 'Unknown MCP id.' });
      return;
    }
    if (isExpired(config.createdAt, ttlHours)) {
      hostedStore.delete(req.params.id);
      res.status(410).json({
        error: 'This MCP URL has expired. Generate it again on SLICE, or ask for a permanent plan.',
      });
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

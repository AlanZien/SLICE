// Runtime end-to-end guarantee for relay mode (Pivot-3, RC2.2/2.4/2.6/2.7):
// generate a real MCP bundle, run it with `tsx` in MCP_AUTH_MODE=relay against
// a mock upstream, and assert that the caller's Authorization header is
// forwarded as the upstream credential — and that a missing/malformed header
// forwards nothing (the upstream's own error surfaces, no fabrication).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { generateMcp } from './mcp-generator';
import type { GenerateRequest, ParsedSpec } from '@shared/types';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const UPSTREAM_HEADER = 'x-shopify-access-token';

const SPEC: ParsedSpec = {
  apiName: 'Shopify Admin',
  apiVersion: '2024-04',
  baseUrl: 'http://127.0.0.1:0',
  authType: 'apiKey',
  authHeader: 'X-Shopify-Access-Token',
  groups: [
    {
      tag: 'Products',
      endpoints: [
        { id: 'GET /products', method: 'GET', path: '/products', label: 'List products', params: [] },
      ],
    },
  ],
};

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.listen(0, () => {
      const port = (srv.address() as { port: number }).port;
      srv.close(() => resolve(port));
    });
  });
}

let dir: string;
let upstream: Server;
let upstreamPort: number;
let received: Array<Record<string, string | string[] | undefined>> = [];

beforeAll(async () => {
  upstreamPort = await freePort();

  // Mock upstream: record headers, always 200.
  upstream = createServer((req, res) => {
    received.push({ ...req.headers });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  });
  await new Promise<void>((r) => upstream.listen(upstreamPort, r));

  // Generate the bundle (apiKey upstream auth) and drop it on disk.
  const req: GenerateRequest = {
    parsedSpec: { ...SPEC, baseUrl: `http://127.0.0.1:${upstreamPort}` },
    rawSpec: '',
    selectedIds: ['GET /products'],
    config: {
      mcpName: 'relay-mcp',
      baseUrl: `http://127.0.0.1:${upstreamPort}`,
      upstreamAuth: { type: 'apiKey', headerName: 'X-Shopify-Access-Token' },
      hosting: 'cloud',
      mode: 'remote',
      includeParamDescriptions: false,
      retryOnServerError: false,
    },
  };
  dir = mkdtempSync(join(tmpdir(), 'slice-relay-'));
  for (const f of generateMcp(req)) {
    const full = join(dir, f.path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, f.content, 'utf-8');
  }
  // Reuse the workspace's installed deps for runtime resolution.
  const sdkRoot = join(process.cwd(), 'node_modules');
  mkdirSync(join(dir, 'node_modules'), { recursive: true });
  symlinkSync(`${sdkRoot}/@modelcontextprotocol`, `${dir}/node_modules/@modelcontextprotocol`);
  symlinkSync(`${sdkRoot}/zod`, `${dir}/node_modules/zod`);
  symlinkSync(`${sdkRoot}/dotenv`, `${dir}/node_modules/dotenv`);
}, 30_000);

afterAll(async () => {
  await new Promise<void>((r) => (upstream ? upstream.close(() => r()) : r()));
  if (dir) rmSync(dir, { recursive: true, force: true });
});

// The generated server uses a single shared transport (one session at a time),
// so each scenario gets a fresh server process.
async function startServer(): Promise<{ port: number; stop: () => void }> {
  const port = await freePort();
  const tsx = join(process.cwd(), 'node_modules', '.bin', 'tsx');
  const child: ChildProcess = spawn(tsx, ['src/index.ts'], {
    cwd: dir,
    env: {
      ...process.env,
      MCP_AUTH_MODE: 'relay',
      MCP_HTTP_PORT: String(port),
      UPSTREAM_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  await new Promise<void>((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('server did not start in time')), 20_000);
    child.stderr!.on('data', (b: Buffer) => {
      if (b.toString().includes('listening on')) {
        clearTimeout(to);
        resolve();
      }
    });
    child.on('exit', (code) => reject(new Error(`server exited early (${code})`)));
  });
  return { port, stop: () => child.kill('SIGKILL') };
}

async function callTool(port: number, authHeader?: string): Promise<void> {
  const client = new Client({ name: 'relay-test', version: '0.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/`), {
    requestInit: authHeader ? { headers: { Authorization: authHeader } } : {},
  });
  await client.connect(transport);
  await client.callTool({ name: 'list_products', arguments: {} });
  await client.close();
}

describe('generated MCP — relay mode runtime (RC2.6)', () => {
  it('forwards the caller bearer token as the upstream API key', async () => {
    received = [];
    const srv = await startServer();
    try {
      await callTool(srv.port, 'Bearer USERSECRET123');
    } finally {
      srv.stop();
    }
    expect(received.at(-1)?.[UPSTREAM_HEADER]).toBe('USERSECRET123');
  }, 30_000);

  it('forwards no credential when the Authorization header is missing (RC2.4)', async () => {
    received = [];
    const srv = await startServer();
    try {
      await callTool(srv.port, undefined);
    } finally {
      srv.stop();
    }
    expect(received.at(-1)?.[UPSTREAM_HEADER]).toBeUndefined();
  }, 30_000);

  it('forwards no credential when the Authorization header is malformed (RC2.7)', async () => {
    received = [];
    const srv = await startServer();
    try {
      await callTool(srv.port, 'Token NOTBEARER');
    } finally {
      srv.stop();
    }
    expect(received.at(-1)?.[UPSTREAM_HEADER]).toBeUndefined();
  }, 30_000);
});

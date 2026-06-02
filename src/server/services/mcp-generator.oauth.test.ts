// Runtime end-to-end guarantee for OAuth2 client_credentials (phase OAuth-1b):
// generate a real MCP bundle for an `oauth2` upstream, run it with `tsx` in
// MCP_AUTH_MODE=env against TWO mock servers — a token endpoint and an upstream
// API — and assert the self-host flow: the kit fetches its own access_token
// (client_secret_basic), caches it, attaches it as a bearer to the upstream,
// retries once on 401, and never leaks the secret. Mono-session kit, so each
// scenario uses a fresh process and SEQUENTIAL calls (concurrency dedup R14 is
// tested on the isolated module — see the "isolated module" describe block).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { generateMcp } from './mcp-generator';
import type { GenerateRequest, GeneratedFile, ParsedSpec } from '@shared/types';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const CLIENT_ID = 'my-client-id';
const CLIENT_SECRET = 'sup3r-s3cr3t-value';
const ACCESS_TOKEN = 'ACCESS_TOKEN_FROM_GUICHET';
// Downstream auth (agent → MCP) in env/HTTP mode is a separate, static token.
const SERVER_TOKEN = 'a'.repeat(32);

const SPEC: ParsedSpec = {
  apiName: 'Widgets',
  apiVersion: '1',
  baseUrl: 'http://127.0.0.1:0',
  authType: 'oauth2',
  groups: [
    {
      tag: 'Things',
      endpoints: [
        { id: 'GET /things', method: 'GET', path: '/things', label: 'List things', params: [] },
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

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c as Buffer));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });
}

// --- Mock token endpoint: records every request, returns a configurable body ---
interface TokenHit {
  method?: string;
  authorization?: string;
  contentType?: string;
  body: string;
}
let tokenHits: TokenHit[] = [];
// Per-scenario control over the token response.
let tokenResponse: { status: number; payload: Record<string, unknown> } = {
  status: 200,
  payload: { access_token: ACCESS_TOKEN, expires_in: 3600, token_type: 'Bearer' },
};

// --- Mock upstream: records auth header, returns 200 (or a one-shot 401) ---
let upstreamAuthSeen: Array<string | undefined> = [];
let upstreamNext401 = 0; // number of leading requests to answer with 401

let tokenServer: Server;
let upstream: Server;
let tokenPort: number;
let upstreamPort: number;
let dir: string;

async function listen(server: Server, port: number): Promise<void> {
  await new Promise<void>((r) => server.listen(port, r));
}

beforeAll(async () => {
  tokenPort = await freePort();
  upstreamPort = await freePort();

  tokenServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const body = await readBody(req);
    tokenHits.push({
      method: req.method,
      authorization: req.headers.authorization,
      contentType: req.headers['content-type'],
      body,
    });
    res.writeHead(tokenResponse.status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(tokenResponse.payload));
  });
  upstream = createServer(async (_req: IncomingMessage, res: ServerResponse) => {
    upstreamAuthSeen.push(_req.headers.authorization);
    if (upstreamNext401 > 0) {
      upstreamNext401 -= 1;
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  });
  await listen(tokenServer, tokenPort);
  await listen(upstream, upstreamPort);

  const req: GenerateRequest = {
    parsedSpec: { ...SPEC, baseUrl: `http://127.0.0.1:${upstreamPort}` },
    rawSpec: '',
    selectedIds: ['GET /things'],
    config: {
      mcpName: 'oauth-mcp',
      baseUrl: `http://127.0.0.1:${upstreamPort}`,
      upstreamAuth: {
        type: 'oauth2',
        tokenUrl: `http://127.0.0.1:${tokenPort}/token`,
        scopes: ['read', 'write'],
      },
      hosting: 'self',
      mode: 'remote',
      mcpServerToken: SERVER_TOKEN,
      includeParamDescriptions: false,
      retryOnServerError: false,
    },
  };
  dir = mkdtempSync(join(tmpdir(), 'slice-oauth-'));
  for (const f of generateMcp(req)) {
    const full = join(dir, f.path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, f.content, 'utf-8');
  }
  const sdkRoot = join(process.cwd(), 'node_modules');
  mkdirSync(join(dir, 'node_modules'), { recursive: true });
  symlinkSync(`${sdkRoot}/@modelcontextprotocol`, `${dir}/node_modules/@modelcontextprotocol`);
  symlinkSync(`${sdkRoot}/zod`, `${dir}/node_modules/zod`);
  symlinkSync(`${sdkRoot}/dotenv`, `${dir}/node_modules/dotenv`);
}, 30_000);

afterAll(async () => {
  await new Promise<void>((r) => (tokenServer ? tokenServer.close(() => r()) : r()));
  await new Promise<void>((r) => (upstream ? upstream.close(() => r()) : r()));
  if (dir) rmSync(dir, { recursive: true, force: true });
});

interface RunningServer {
  port: number;
  stop: () => void;
}

async function startServer(extraEnv: Record<string, string> = {}): Promise<RunningServer> {
  const port = await freePort();
  const tsx = join(process.cwd(), 'node_modules', '.bin', 'tsx');
  const child: ChildProcess = spawn(tsx, ['src/index.ts'], {
    cwd: dir,
    env: {
      ...process.env,
      MCP_AUTH_MODE: 'env',
      MCP_HTTP_PORT: String(port),
      MCP_SERVER_TOKEN: SERVER_TOKEN,
      UPSTREAM_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
      UPSTREAM_OAUTH_CLIENT_ID: CLIENT_ID,
      UPSTREAM_OAUTH_CLIENT_SECRET: CLIENT_SECRET,
      ...extraEnv,
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

async function callTool(port: number, authHeader: string = `Bearer ${SERVER_TOKEN}`): Promise<void> {
  const client = new Client({ name: 'oauth-test', version: '0.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/`), {
    requestInit: { headers: { Authorization: authHeader } },
  });
  await client.connect(transport);
  await client.callTool({ name: 'list_things', arguments: {} });
  await client.close();
}

// Two tool calls within ONE session (the kit is mono-session, so a second
// connect would fail with "Server already initialized"). Used to observe the
// token cache: the in-process cache is shared across calls of the same session.
async function callToolTwice(port: number): Promise<void> {
  const client = new Client({ name: 'oauth-test', version: '0.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/`), {
    requestInit: { headers: { Authorization: `Bearer ${SERVER_TOKEN}` } },
  });
  await client.connect(transport);
  await client.callTool({ name: 'list_things', arguments: {} });
  await client.callTool({ name: 'list_things', arguments: {} });
  await client.close();
}

function resetState(): void {
  tokenHits = [];
  upstreamAuthSeen = [];
  upstreamNext401 = 0;
  tokenResponse = {
    status: 200,
    payload: { access_token: ACCESS_TOKEN, expires_in: 3600, token_type: 'Bearer' },
  };
}

describe('generated MCP — oauth2 client_credentials runtime (env / self-host)', () => {
  it('posts client_credentials with client_secret_basic + scope (R11)', async () => {
    resetState();
    const srv = await startServer();
    try {
      await callTool(srv.port);
    } finally {
      srv.stop();
    }
    expect(tokenHits.length).toBeGreaterThanOrEqual(1);
    const hit = tokenHits[0]!;
    expect(hit.method).toBe('POST');
    expect(hit.contentType).toContain('application/x-www-form-urlencoded');
    const expectedBasic = `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`;
    expect(hit.authorization).toBe(expectedBasic);
    const params = new URLSearchParams(hit.body);
    expect(params.get('grant_type')).toBe('client_credentials');
    expect(params.get('scope')).toBe('read write');
  }, 30_000);

  it('attaches the fetched access_token as a bearer to the upstream (R12)', async () => {
    resetState();
    const srv = await startServer();
    try {
      await callTool(srv.port);
    } finally {
      srv.stop();
    }
    expect(upstreamAuthSeen.at(-1)).toBe(`Bearer ${ACCESS_TOKEN}`);
  }, 30_000);

  it('caches the token (long expiry → 1 POST), refetches on expiry / default TTL (R13)', async () => {
    // expires_in long → second call (same session) reuses the cached token.
    resetState();
    let srv = await startServer();
    try {
      await callToolTwice(srv.port);
    } finally {
      srv.stop();
    }
    expect(tokenHits.length).toBe(1);

    // expires_in: 0 → token is always stale → every call refetches.
    resetState();
    tokenResponse = { status: 200, payload: { access_token: ACCESS_TOKEN, expires_in: 0 } };
    srv = await startServer();
    try {
      await callToolTwice(srv.port);
    } finally {
      srv.stop();
    }
    expect(tokenHits.length).toBe(2);

    // expires_in absent → a finite default TTL (300s) applies → cache hit.
    resetState();
    tokenResponse = { status: 200, payload: { access_token: ACCESS_TOKEN } };
    srv = await startServer();
    try {
      await callToolTwice(srv.port);
    } finally {
      srv.stop();
    }
    expect(tokenHits.length).toBe(1);
  }, 60_000);

  it('on a 401 from upstream, refetches the token once and replays (R15)', async () => {
    resetState();
    upstreamNext401 = 1; // first upstream call → 401, second → 200
    const srv = await startServer();
    try {
      await callTool(srv.port); // should succeed after one token refetch + replay
    } finally {
      srv.stop();
    }
    // One fetch for the initial call + one after invalidation on the 401.
    expect(tokenHits.length).toBe(2);
    expect(upstreamAuthSeen.length).toBe(2);
  }, 30_000);

  it('refuses to start in env mode without client id/secret (R10)', async () => {
    await expect(
      startServer({ UPSTREAM_OAUTH_CLIENT_ID: '', UPSTREAM_OAUTH_CLIENT_SECRET: '' })
    ).rejects.toThrow();
  }, 30_000);

  it('a token endpoint failure or non-bearer token_type aborts before the upstream (R16/R16bis)', async () => {
    // Token endpoint 500 → getAccessToken throws → upstream never reached.
    resetState();
    tokenResponse = { status: 500, payload: { error: 'boom' } };
    let srv = await startServer();
    try {
      await callTool(srv.port);
    } finally {
      srv.stop();
    }
    expect(tokenHits.length).toBeGreaterThanOrEqual(1);
    expect(upstreamAuthSeen.length).toBe(0);

    // token_type other than bearer → rejected, upstream never reached.
    resetState();
    tokenResponse = { status: 200, payload: { access_token: ACCESS_TOKEN, token_type: 'mac' } };
    srv = await startServer();
    try {
      await callTool(srv.port);
    } finally {
      srv.stop();
    }
    expect(upstreamAuthSeen.length).toBe(0);
  }, 30_000);

  it('relay mode forwards the caller bearer and never calls the token endpoint (R20)', async () => {
    resetState();
    const srv = await startServer({ MCP_AUTH_MODE: 'relay' });
    try {
      await callTool(srv.port, 'Bearer USER_PROVIDED_TOKEN');
    } finally {
      srv.stop();
    }
    expect(upstreamAuthSeen.at(-1)).toBe('Bearer USER_PROVIDED_TOKEN');
    expect(tokenHits.length).toBe(0);
  }, 30_000);
});

// --- Static assertions on the generated source (no runtime) ---

function genOAuthFiles(): GeneratedFile[] {
  const req: GenerateRequest = {
    parsedSpec: { ...SPEC, baseUrl: 'https://api.example.com' },
    rawSpec: '',
    selectedIds: ['GET /things'],
    config: {
      mcpName: 'oauth-mcp',
      baseUrl: 'https://api.example.com',
      upstreamAuth: { type: 'oauth2', tokenUrl: 'https://api.example.com/oauth/token', scopes: ['read'] },
      hosting: 'self',
      mode: 'both',
      mcpServerToken: 'a'.repeat(32),
      includeParamDescriptions: false,
      retryOnServerError: false,
    },
  };
  return generateMcp(req);
}

describe('generated oauth2 bundle — source-level guarantees', () => {
  const files = genOAuthFiles();
  const fileBy = (p: string) => files.find((f) => f.path === p)?.content ?? '';

  it('emits src/oauth-token.ts only for oauth2 bundles (T1)', () => {
    expect(files.some((f) => f.path === 'src/oauth-token.ts')).toBe(true);
  });

  it('reads the secret from env and never bakes it into an error message (R17/R17bis)', () => {
    const oauthToken = fileBy('src/oauth-token.ts');
    expect(oauthToken).toContain('process.env.UPSTREAM_OAUTH_CLIENT_SECRET');
    // Error messages carry the status only — never the secret, the Basic
    // header value, or the token response body.
    expect(oauthToken).toMatch(/Failed to obtain OAuth token: \$\{res\.status\}/);
    expect(oauthToken).not.toMatch(/Error\([^)]*\$\{basic\}/);
    expect(oauthToken).not.toMatch(/Error\([^)]*clientSecret/);
    expect(oauthToken).not.toContain('await res.text()');
  });

  it('documents the oauth2 env vars in .env.example (R18)', () => {
    const env = fileBy('.env.example');
    expect(env).toContain('UPSTREAM_OAUTH_CLIENT_ID=');
    expect(env).toContain('UPSTREAM_OAUTH_CLIENT_SECRET=');
  });

  it('JSON-encodes a hostile tokenUrl/scopes so it cannot inject code (security)', () => {
    // Bypass Zod (generateMcp is the generation-point defense): a hostile spec
    // tries to break out of the string literal and run code in the user's kit.
    const req: GenerateRequest = {
      parsedSpec: { ...SPEC, baseUrl: 'https://api.example.com' },
      rawSpec: '',
      selectedIds: ['GET /things'],
      config: {
        mcpName: 'oauth-mcp',
        baseUrl: 'https://api.example.com',
        upstreamAuth: {
          type: 'oauth2',
          tokenUrl: "https://e.com/x';globalThis.PWNED=1;'",
          scopes: ["a';globalThis.PWNED2=1;'"],
        },
        hosting: 'self',
        mode: 'both',
        mcpServerToken: 'a'.repeat(32),
        includeParamDescriptions: false,
        retryOnServerError: false,
      },
    };
    const oauthToken = generateMcp(req).find((f) => f.path === 'src/oauth-token.ts')!.content;
    // Values are emitted as JSON double-quoted literals — never raw single-quoted.
    expect(oauthToken).toMatch(/const TOKEN_URL = "/);
    expect(oauthToken).toMatch(/const SCOPES = "/);
    expect(oauthToken).not.toMatch(/const TOKEN_URL = '/);
    expect(oauthToken).not.toMatch(/const SCOPES = '/);
    // The payload survives only as inert string data, never as a statement.
    expect(oauthToken).not.toMatch(/^globalThis\.PWNED/m);
  });
});

// --- Concurrency dedup on the isolated module (R14) ---
// The kit is mono-session, so concurrent calls can't be driven through the MCP
// transport. We import the generated oauth-token module directly and fire three
// getAccessToken() calls at once: the in-flight promise must collapse them into
// a single token request.
describe('generated oauth-token module — concurrency dedup (R14)', () => {
  it('dedups concurrent getAccessToken() into a single token fetch', async () => {
    process.env.UPSTREAM_OAUTH_CLIENT_ID = CLIENT_ID;
    process.env.UPSTREAM_OAUTH_CLIENT_SECRET = CLIENT_SECRET;
    resetState();
    // Vite refuses to load modules from outside the project root, so copy the
    // generated module (it already points at the mock token endpoint) into a
    // project-local temp dir before importing it.
    const localDir = join(process.cwd(), '.tmp-oauth-mod');
    mkdirSync(localDir, { recursive: true });
    const modPath = join(localDir, 'oauth-token.ts');
    writeFileSync(modPath, readFileSync(join(dir, 'src/oauth-token.ts'), 'utf-8'));
    try {
      const mod = (await import(modPath)) as { getAccessToken: () => Promise<string> };
      const tokens = await Promise.all([
        mod.getAccessToken(),
        mod.getAccessToken(),
        mod.getAccessToken(),
      ]);
      expect(tokens).toEqual([ACCESS_TOKEN, ACCESS_TOKEN, ACCESS_TOKEN]);
      expect(tokenHits.length).toBe(1);
    } finally {
      rmSync(localDir, { recursive: true, force: true });
    }
  }, 30_000);
});

/**
 * Prod smoke (lever « vrai chemin de build ») — boot the ACTUAL compiled prod
 * server and exercise the real production paths. Unit tests run under tsx/Vite
 * and never touch the compiled output, so an entire class of bugs stays hidden
 * until deploy: ESM extension/alias resolution, Express 5 route syntax, static
 * + SPA fallback path resolution, and the parse child_process spawning the
 * compiled `parse-child.js` (not the `.ts` under tsx). Every one of those was a
 * live prod break invisible to the green test suite. This is the gate.
 *
 *   pnpm prod:smoke           # builds, boots, checks, tears down
 *   SKIP_BUILD=1 pnpm prod:smoke   # reuse an existing dist/ (faster local loop)
 *
 * Exits non-zero on the first failed check — wire it into CI pre-release.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PORT = Number(process.env.PORT ?? 3099);
const BASE = `http://localhost:${PORT}`;
const ROOT = resolve(import.meta.dirname, '..');
const SERVER_ENTRY = 'dist/server/server/index.js';

function run(cmd: string, args: string[]): void {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) {
    throw new Error(`\`${cmd} ${args.join(' ')}\` exited with ${r.status}`);
  }
}

async function waitForHealth(child: ChildProcess): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (child.exitCode !== null) {
      throw new Error(`server exited early with code ${child.exitCode}`);
    }
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {
      // not listening yet
    }
    await sleep(200);
  }
  throw new Error('server did not become healthy within 10s');
}

const checks: { name: string; fn: () => Promise<void> }[] = [
  {
    name: 'GET /api/health returns 200 + ok',
    fn: async () => {
      const res = await fetch(`${BASE}/api/health`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = (await res.json()) as { ok?: boolean; env?: string };
      if (body.ok !== true) throw new Error(`unexpected body ${JSON.stringify(body)}`);
      if (body.env !== 'production') throw new Error(`env is ${body.env}, expected production`);
    },
  },
  {
    name: 'GET / serves the client index.html',
    fn: async () => {
      const res = await fetch(`${BASE}/`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const html = await res.text();
      if (!html.includes('<title>')) throw new Error('response is not an HTML document');
    },
  },
  {
    name: 'GET /deep/spa/route falls back to index.html (SPA catch-all)',
    fn: async () => {
      const res = await fetch(`${BASE}/deep/spa/route`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const html = await res.text();
      if (!html.includes('<title>')) throw new Error('fallback did not serve the SPA shell');
    },
  },
  {
    name: 'POST /api/upload parses a spec via the compiled child_process',
    fn: async () => {
      const specPath = resolve(ROOT, 'fixtures/petstore-swagger2.json');
      const file = new File([readFileSync(specPath)], 'petstore-swagger2.json', {
        type: 'application/json',
      });
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${BASE}/api/upload`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`status ${res.status}: ${await res.text()}`);
      const body = (await res.json()) as { apiName?: string; groups?: unknown[] };
      if (!body.apiName || !Array.isArray(body.groups) || body.groups.length === 0) {
        throw new Error(`parse produced no usable result: ${JSON.stringify(body).slice(0, 200)}`);
      }
    },
  },
];

async function main(): Promise<void> {
  if (process.env.SKIP_BUILD !== '1') {
    console.log('› building prod bundle (pnpm build)…');
    run('pnpm', ['build']);
  } else {
    console.log('› SKIP_BUILD=1 — reusing existing dist/');
  }

  console.log(`› booting compiled server on :${PORT}…`);
  const child = spawn(process.execPath, [SERVER_ENTRY], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: 'production', PORT: String(PORT) },
    stdio: ['ignore', 'inherit', 'inherit'],
  });

  let failed = false;
  try {
    await waitForHealth(child);
    for (const check of checks) {
      await check.fn();
      console.log(`  ✓ ${check.name}`);
    }
    console.log('\n✅ prod smoke passed');
  } catch (err) {
    failed = true;
    console.error(`\n❌ prod smoke failed: ${(err as Error).message}`);
  } finally {
    child.kill('SIGTERM');
  }

  process.exit(failed ? 1 : 0);
}

void main();

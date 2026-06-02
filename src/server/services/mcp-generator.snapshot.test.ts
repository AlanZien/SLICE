import { describe, it, expect } from 'vitest';
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { parseSpec } from './parser';
import { generateMcp } from './mcp-generator';
import type { GenerateRequest, GeneratedFile } from '@shared/types';

const FIXTURE_PATH = 'fixtures/shopify-50.yaml';

/**
 * Drop a generated bundle on disk, mirror the workspace's SDK deps via symlinks,
 * and type-check it with the workspace tsc binary (hermetic — see the note on
 * `pnpm exec` below). Throws with the tsc output on failure.
 */
function typecheckBundle(files: GeneratedFile[]): void {
  const dir = mkdtempSync(join(tmpdir(), 'slice-mcp-'));
  try {
    for (const f of files) {
      const full = join(dir, f.path);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, f.content, 'utf-8');
    }
    const sdkRoot = join(process.cwd(), 'node_modules');
    mkdirSync(join(dir, 'node_modules'), { recursive: true });
    execSync(`ln -s "${sdkRoot}/@modelcontextprotocol" "${dir}/node_modules/@modelcontextprotocol"`);
    execSync(`ln -s "${sdkRoot}/zod" "${dir}/node_modules/zod"`);
    execSync(`ln -s "${sdkRoot}/dotenv" "${dir}/node_modules/dotenv"`);
    mkdirSync(join(dir, 'node_modules/@types'), { recursive: true });
    execSync(`ln -s "${sdkRoot}/@types/node" "${dir}/node_modules/@types/node"`);

    // Invoke the workspace tsc binary DIRECTLY (not via `pnpm exec`): under CI,
    // corepack pulls a newer pnpm whose `verify-deps-before-run` fires an
    // implicit `pnpm install` in this tmp dir, clobbering the symlinks above and
    // breaking SDK subpath resolution. A direct binary call is hermetic.
    const tscBin = join(process.cwd(), 'node_modules', '.bin', 'tsc');
    try {
      execSync(`"${tscBin}" --noEmit -p tsconfig.json`, { cwd: dir, stdio: 'pipe' });
    } catch (err) {
      const e = err as { stdout?: Buffer; stderr?: Buffer };
      const out = `${e.stdout?.toString() ?? ''}\n${e.stderr?.toString() ?? ''}`;
      throw new Error(`tsc failed:\n${out}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * End-to-end snapshot: parse a real OpenAPI spec, run the generator, then
 * type-check the emitted TypeScript with `tsc --noEmit`. This guards two
 * things at once — that the templates render valid TS, and that the
 * generated package's tsconfig is honest about what it claims to compile.
 */
describe('generateMcp — snapshot + tsc smoke (07-6)', () => {
  it('loads .env automatically at startup (R: generated MCP runs without manual env)', async () => {
    const raw = readFileSync(FIXTURE_PATH, 'utf-8');
    const parsed = await parseSpec(raw, { sizeBytes: raw.length });
    const selectedIds = parsed.groups
      .flatMap((g) => g.endpoints.map((e) => e.id))
      .slice(0, 2);
    const req: GenerateRequest = {
      parsedSpec: parsed,
      rawSpec: raw,
      selectedIds,
      config: {
        mcpName: 'env-smoke',
        baseUrl: parsed.baseUrl,
        upstreamAuth: { type: 'none' },
        mode: 'local',
        includeParamDescriptions: false,
        retryOnServerError: false,
      },
    };
    const files = generateMcp(req);
    const index = files.find((f) => f.path === 'src/index.ts')!.content;
    // The generated entry point must self-load `.env` so `node dist/index.js`
    // works out of the box. Without this import, a freshly-unzipped bundle
    // throws `UPSTREAM_BASE_URL is required` even with a valid .env on disk.
    expect(index).toMatch(/import\s+['"]dotenv\/config['"]/);
  });

  it('produces a fully type-checkable bundle for a real spec', async () => {
    const raw = readFileSync(FIXTURE_PATH, 'utf-8');
    const parsed = await parseSpec(raw, { sizeBytes: raw.length });
    const selectedIds = parsed.groups.flatMap((g) => g.endpoints.map((e) => e.id));
    expect(selectedIds.length).toBeGreaterThan(0);

    const req: GenerateRequest = {
      parsedSpec: parsed,
      rawSpec: raw,
      selectedIds,
      config: {
        mcpName: parsed.defaultConfig?.mcpName ?? 'snapshot-mcp',
        baseUrl: parsed.defaultConfig?.baseUrl ?? parsed.baseUrl,
        upstreamAuth: parsed.defaultConfig?.upstreamAuth ?? { type: 'none' },
        mode: 'both',
        mcpServerToken: 'a'.repeat(32),
        includeParamDescriptions: false,
        retryOnServerError: false,
      },
    };

    const files = generateMcp(req);
    const paths = files.map((f) => f.path).sort();
    expect(paths).toEqual(
      [
        '.dockerignore',
        '.env.example',
        '.gitignore',
        'Dockerfile',
        'README.md',
        'docker-compose.yml',
        'package.json',
        'src/auth-context.ts',
        'src/http-client.ts',
        'src/index.ts',
        'src/tools.ts',
        'tsconfig.json',
      ].sort()
    );

    // The number of selected endpoints should match the number of
    // `server.tool(` registrations in the emitted tools.ts.
    const toolsContent = files.find((f) => f.path === 'src/tools.ts')!.content;
    const toolCalls = toolsContent.match(/server\.tool\(/g)?.length ?? 0;
    expect(toolCalls).toBe(selectedIds.length);

    // Smoke: drop the bundle on disk and let tsc validate it.
    typecheckBundle(files);
  }, 60_000);

  it('produces a type-checkable bundle for an oauth2 upstream (incl. oauth-token.ts) (R19)', async () => {
    const raw = readFileSync(FIXTURE_PATH, 'utf-8');
    const parsed = await parseSpec(raw, { sizeBytes: raw.length });
    const selectedIds = parsed.groups.flatMap((g) => g.endpoints.map((e) => e.id)).slice(0, 3);

    const req: GenerateRequest = {
      parsedSpec: parsed,
      rawSpec: raw,
      selectedIds,
      config: {
        mcpName: 'oauth-snapshot',
        baseUrl: 'https://api.example.com',
        upstreamAuth: { type: 'oauth2', tokenUrl: 'https://api.example.com/oauth/token', scopes: ['read'] },
        mode: 'both',
        mcpServerToken: 'a'.repeat(32),
        includeParamDescriptions: false,
        retryOnServerError: false,
      },
    };

    const files = generateMcp(req);
    // The oauth-token module is emitted only for oauth2 bundles.
    expect(files.some((f) => f.path === 'src/oauth-token.ts')).toBe(true);
    typecheckBundle(files);
  }, 60_000);
});

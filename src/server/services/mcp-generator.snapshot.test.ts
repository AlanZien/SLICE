import { describe, it, expect } from 'vitest';
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { parseSpec } from './parser';
import { generateMcp } from './mcp-generator';
import type { GenerateRequest } from '@shared/types';

const FIXTURE_PATH = 'fixtures/shopify-50.yaml';

/**
 * End-to-end snapshot: parse a real OpenAPI spec, run the generator, then
 * type-check the emitted TypeScript with `tsc --noEmit`. This guards two
 * things at once — that the templates render valid TS, and that the
 * generated package's tsconfig is honest about what it claims to compile.
 */
describe('generateMcp — snapshot + tsc smoke (07-6)', () => {
  it('produces a fully type-checkable bundle for a real spec', async () => {
    const raw = readFileSync(FIXTURE_PATH, 'utf-8');
    const parsed = await parseSpec(raw, { sizeBytes: raw.length });
    const selectedIds = parsed.groups.flatMap((g) => g.endpoints.map((e) => e.id));
    expect(selectedIds.length).toBeGreaterThan(0);

    const req: GenerateRequest = {
      parsedSpec: parsed,
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
        '.env.example',
        '.gitignore',
        'README.md',
        'package.json',
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
    const dir = mkdtempSync(join(tmpdir(), 'slice-mcp-'));
    try {
      for (const f of files) {
        const full = join(dir, f.path);
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, f.content, 'utf-8');
      }
      // Mirror the resolution that `pnpm install` would set up: point the
      // generated package at the SDK already installed in the workspace.
      const sdkRoot = join(process.cwd(), 'node_modules');
      mkdirSync(join(dir, 'node_modules'), { recursive: true });
      execSync(`ln -s "${sdkRoot}/@modelcontextprotocol" "${dir}/node_modules/@modelcontextprotocol"`);
      execSync(`ln -s "${sdkRoot}/zod" "${dir}/node_modules/zod"`);
      mkdirSync(join(dir, 'node_modules/@types'), { recursive: true });
      execSync(`ln -s "${sdkRoot}/@types/node" "${dir}/node_modules/@types/node"`);

      try {
        execSync('pnpm exec tsc --noEmit -p tsconfig.json', { cwd: dir, stdio: 'pipe' });
      } catch (err) {
        const e = err as { stdout?: Buffer; stderr?: Buffer };
        const out = `${e.stdout?.toString() ?? ''}\n${e.stderr?.toString() ?? ''}`;
        throw new Error(`tsc failed:\n${out}`);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});

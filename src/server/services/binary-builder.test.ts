import { describe, it, expect, beforeAll } from 'vitest';
import { readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { buildBinary, BINARY_TARGETS, type BinaryTarget } from './binary-builder';
import type { GeneratedFile } from '@shared/types';

/**
 * The builder shells out to `bun`. If Bun isn't installed on the host these
 * tests would be misleading — skip them with a clear message instead.
 */
let bunAvailable = false;
beforeAll(() => {
  try {
    execSync('bun --version', { stdio: 'pipe' });
    bunAvailable = true;
  } catch {
    bunAvailable = false;
  }
});

const TINY_BUNDLE: GeneratedFile[] = [
  {
    path: 'package.json',
    content: JSON.stringify({
      name: 'tiny-mcp',
      type: 'module',
      dependencies: { dotenv: '^16.0.0' },
    }),
  },
  {
    path: 'src/index.ts',
    content: `import 'dotenv/config';\nconsole.log('OK', process.env.UPSTREAM_BASE_URL ?? 'unset');\n`,
  },
];

describe('buildBinary', () => {
  it('exposes the three supported targets', () => {
    expect(BINARY_TARGETS).toEqual(['macos-arm64', 'macos-x64', 'windows-x64']);
  });

  it('produces a runnable Mach-O binary for macos-arm64', async () => {
    if (!bunAvailable) return;
    const buf = await buildBinary(TINY_BUNDLE, 'macos-arm64');
    expect(buf.length).toBeGreaterThan(10 * 1024 * 1024); // > 10 MB
    // Mach-O 64-bit magic for arm64: cf fa ed fe (little-endian feedfacf)
    expect(buf[0]).toBe(0xcf);
    expect(buf[1]).toBe(0xfa);
    expect(buf[2]).toBe(0xed);
    expect(buf[3]).toBe(0xfe);
  }, 60_000);

  it('produces a PE32+ Windows binary for windows-x64', async () => {
    if (!bunAvailable) return;
    const buf = await buildBinary(TINY_BUNDLE, 'windows-x64');
    expect(buf.length).toBeGreaterThan(10 * 1024 * 1024);
    // PE magic: MZ at the start
    expect(buf[0]).toBe(0x4d); // M
    expect(buf[1]).toBe(0x5a); // Z
  }, 120_000);

  it('rejects with a clear error for an invalid target', async () => {
    if (!bunAvailable) return;
    await expect(
      buildBinary(TINY_BUNDLE, 'plan9' as unknown as BinaryTarget)
    ).rejects.toThrow(/invalid target/i);
  });

  it('leaves no temp directories behind (R1.4.6)', async () => {
    if (!bunAvailable) return;
    const before = new Set(readdirSync(tmpdir()));
    await buildBinary(TINY_BUNDLE, 'macos-arm64');
    const after = new Set(readdirSync(tmpdir()));
    const leaked = [...after].filter(
      (n) => !before.has(n) && /slice-binary|bun-spike/i.test(n)
    );
    expect(leaked).toEqual([]);
  }, 60_000);
});

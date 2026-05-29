/**
 * Compile a generated MCP bundle into a standalone executable using Bun.
 *
 * Why Bun: it bundles the TypeScript source AND embeds the runtime in a
 * single file (`bun build --compile`). The user doesn't need Node.js or any
 * runtime installed — just download the binary, double-click, done.
 *
 * Pipeline per request:
 *   1. Write the generated source files to a fresh temp directory
 *   2. `bun install --production` to materialise node_modules
 *   3. `bun build src/index.ts --compile --target=<target> --outfile=mcp`
 *   4. Read the produced binary into a Buffer
 *   5. Remove the temp directory unconditionally (R1.4.6)
 *
 * Total cold latency on this machine ~3-4 s; warm (cached deps) ~1-2 s.
 */
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { GeneratedFile } from '@shared/types';

const execFileP = promisify(execFile);

/** Supported compile targets. Linux is intentionally out of scope for v1. */
export const BINARY_TARGETS = ['macos-arm64', 'macos-x64', 'windows-x64'] as const;
export type BinaryTarget = (typeof BINARY_TARGETS)[number];

const BUN_TARGET_FLAG: Record<BinaryTarget, string> = {
  'macos-arm64': 'bun-darwin-arm64',
  'macos-x64': 'bun-darwin-x64',
  'windows-x64': 'bun-windows-x64',
};

const BUILD_TIMEOUT_MS = 30_000;

/**
 * Compile the given files into a single executable for the requested target.
 * Throws on invalid target, build failure, or timeout. The caller owns the
 * returned Buffer; this function leaves no state behind.
 */
export async function buildBinary(
  files: ReadonlyArray<GeneratedFile>,
  target: BinaryTarget
): Promise<Buffer> {
  if (!BINARY_TARGETS.includes(target)) {
    throw new Error(`Invalid target: ${String(target)}`);
  }

  const dir = mkdtempSync(join(tmpdir(), 'slice-binary-'));
  const isWindows = target === 'windows-x64';
  const outfile = join(dir, isWindows ? 'mcp.exe' : 'mcp');

  try {
    // 1. Materialise the bundle on disk.
    for (const file of files) {
      const full = join(dir, file.path);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, file.content, 'utf-8');
    }

    // 2. Install deps. `--production` keeps node_modules lean and faster.
    await execFileP('bun', ['install', '--production'], {
      cwd: dir,
      timeout: BUILD_TIMEOUT_MS,
    });

    // 3. Compile with the right cross-target.
    await execFileP(
      'bun',
      [
        'build',
        'src/index.ts',
        '--compile',
        '--target',
        BUN_TARGET_FLAG[target],
        '--outfile',
        outfile,
      ],
      { cwd: dir, timeout: BUILD_TIMEOUT_MS }
    );

    // 4. Slurp the binary into memory and hand it off.
    return readFileSync(outfile);
  } finally {
    // 5. No persistence (R1.4.6). `force: true` swallows "not found" errors
    //    if a previous step never created the file.
    rmSync(dir, { recursive: true, force: true });
  }
}

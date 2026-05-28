/**
 * In-memory ZIP streamer. Takes the file list produced by `generateMcp()`
 * and returns a Readable that yields a valid `.zip` archive — no temp files
 * on disk (R1.4.3, R1.4.6). The caller pipes the result directly into the
 * Express response so the bytes leave the process as soon as they are
 * compressed.
 */
import { ZipArchive } from 'archiver';
import type { Readable } from 'node:stream';
import type { GeneratedFile } from '@shared/types';

/**
 * Build a ZIP stream from a list of generated files.
 *
 * Compression level 6 is the archiver default and a good balance:
 * MCP bundles are dominated by small TypeScript / JSON files, so going
 * higher buys very little and adds noticeable CPU latency.
 */
export function buildZipStream(files: ReadonlyArray<GeneratedFile>): Readable {
  const archive = new ZipArchive({ zlib: { level: 6 } });

  // `archiver` is a Readable — but we surface it as `Readable` (not the
  // archiver-specific type) so the route handler doesn't leak the dep.
  for (const file of files) {
    archive.append(file.content, { name: file.path });
  }

  // `finalize()` flushes the central directory. It returns a Promise but we
  // don't await it: the stream emits its bytes as soon as the consumer
  // starts pulling, and any error surfaces via the standard `error` event.
  void archive.finalize();

  return archive;
}

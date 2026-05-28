/**
 * In-memory ZIP streamer. Takes the file list produced by `generateMcp()`
 * and returns a Readable that yields a valid `.zip` archive — no temp files
 * on disk (R1.4.3, R1.4.6). The caller pipes the result directly into the
 * Express response so the bytes leave the process as soon as they are
 * compressed.
 */
import { ZipArchive } from 'archiver';
import type { GeneratedFile } from '@shared/types';

/**
 * Build a ZIP stream from a list of generated files.
 *
 * Compression level 6 is the archiver default and a good balance:
 * MCP bundles are dominated by small TypeScript / JSON files, so going
 * higher buys very little and adds noticeable CPU latency.
 */
export function buildZipStream(files: ReadonlyArray<GeneratedFile>): NodeJS.ReadableStream {
  const archive = new ZipArchive({ zlib: { level: 6 } });

  // `archiver` is a Readable — but we surface it as `Readable` (not the
  // archiver-specific type) so the route handler doesn't leak the dep.
  for (const file of files) {
    archive.append(file.content, { name: file.path });
  }

  // `finalize()` flushes the central directory. We don't await it (the
  // stream emits as soon as the consumer pulls), but any rejection must
  // re-emit through the stream so the caller's `.on('error')` catches it.
  // Without this, a finalize failure becomes an unhandledRejection.
  archive.finalize().catch((err: unknown) => {
    archive.emit('error', err instanceof Error ? err : new Error(String(err)));
  });

  return archive;
}

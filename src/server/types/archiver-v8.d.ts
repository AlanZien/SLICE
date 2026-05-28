/**
 * Archiver v8 ships ESM-only with a class-based API (`ZipArchive`,
 * `TarArchive`, `JsonArchive`). `@types/archiver` still describes the v7
 * default-function API, so we augment the module declaration with the
 * runtime exports we actually use.
 *
 * Once `@types/archiver` catches up to v8, delete this file.
 */
declare module 'archiver' {
  import type * as stream from 'node:stream';

  interface ZipOptions {
    zlib?: { level?: number };
  }

  // Re-export the structural shape of an archiver instance we rely on.
  interface ArchiverInstance extends stream.Transform {
    append(source: string | Buffer | NodeJS.ReadableStream, data: { name: string }): this;
    finalize(): Promise<void>;
  }

  export class ZipArchive extends stream.Transform implements ArchiverInstance {
    constructor(options?: ZipOptions);
    append(source: string | Buffer | NodeJS.ReadableStream, data: { name: string }): this;
    finalize(): Promise<void>;
  }
}

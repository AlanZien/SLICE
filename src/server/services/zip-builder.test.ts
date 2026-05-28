import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import yauzl from 'yauzl';
import { buildZipStream } from './zip-builder';
import type { GeneratedFile } from '@shared/types';

/** Drain a Readable into a single Buffer for assertion. */
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Decompress an in-memory ZIP into a {path → content} map for assertion. */
function unzipToMap(buf: Buffer): Promise<Map<string, string>> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buf, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) return reject(err ?? new Error('no zip'));
      const out = new Map<string, string>();
      zip.on('entry', (entry) => {
        if (/\/$/.test(entry.fileName)) {
          zip.readEntry();
          return;
        }
        zip.openReadStream(entry, (e, rs) => {
          if (e || !rs) return reject(e ?? new Error('no stream'));
          const chunks: Buffer[] = [];
          rs.on('data', (c) => chunks.push(c));
          rs.on('end', () => {
            out.set(entry.fileName, Buffer.concat(chunks).toString('utf-8'));
            zip.readEntry();
          });
        });
      });
      zip.on('end', () => resolve(out));
      zip.on('error', reject);
      zip.readEntry();
    });
  });
}

const SAMPLE: GeneratedFile[] = [
  { path: 'package.json', content: '{"name":"x"}' },
  { path: 'src/index.ts', content: 'console.log("hi");\n' },
  { path: 'README.md', content: '# Hi\n' },
];

describe('buildZipStream', () => {
  it('returns a stream that decompresses to all input files', async () => {
    const stream = buildZipStream(SAMPLE);
    const buf = await streamToBuffer(stream);
    const map = await unzipToMap(buf);
    expect(map.get('package.json')).toBe('{"name":"x"}');
    expect(map.get('src/index.ts')).toBe('console.log("hi");\n');
    expect(map.get('README.md')).toBe('# Hi\n');
  });

  it('does not leave temp files behind (R1.4.6 — no persistence)', async () => {
    const before = new Set(readdirSync(tmpdir()));
    const stream = buildZipStream(SAMPLE);
    await streamToBuffer(stream);
    const after = new Set(readdirSync(tmpdir()));
    const added = [...after].filter((n) => !before.has(n) && /zip|archive|slice/i.test(n));
    expect(added).toEqual([]);
  });

  it('produces an empty but valid ZIP when given no files', async () => {
    const stream = buildZipStream([]);
    const buf = await streamToBuffer(stream);
    const map = await unzipToMap(buf);
    expect(map.size).toBe(0);
  });
});

/**
 * Corpus check (lever B) — stress SLICE's pipeline against a DIVERSE set of
 * real-world OpenAPI specs from APIs.guru, surfacing edge cases that any single
 * API (Notion) can't. For each spec it runs parse → normalize → generate and
 * verifies the generated Zod input schemas actually CONSTRUCT (the class of bug
 * we keep hitting: a spec shape that produces invalid/throwing Zod).
 *
 *   pnpm exec tsx scripts/corpus-check.ts [sampleSize=40]
 *
 * Verdicts per spec:
 *   - reject  : SLICE refused it with a typed ParseError (fine — graceful)
 *   - CRASH   : an unexpected throw in parse/generate (a real bug)
 *   - zodfail : a generated tool's inputSchema didn't construct (a real bug)
 *   - ok      : parsed, generated, every input schema constructs
 * Only CRASH and zodfail are failures worth fixing.
 */
import { z } from 'zod';
import { parseSpec } from '../src/server/services/parser';
import { generateMcp } from '../src/server/services/mcp-generator';
import { ParseError, type GenerateRequest } from '../src/shared/types';

const LIST_URL = 'https://api.apis.guru/v2/list.json';
// SLICE's real limit is 10 MB, but some specs UNDER that (e.g. DocuSign at
// 3 MB) OOM the parser when swagger-parser dereferences their `$ref` graph —
// a robustness finding tracked separately. Override with CORPUS_MAX_BYTES to
// skip the OOM-prone giants so a bulk run can complete.
const MAX_BYTES = Number(process.env.CORPUS_MAX_BYTES ?? 10 * 1024 * 1024);
const MAX_ENDPOINTS = 120;

interface Entry {
  name: string;
  url: string;
}

interface Verdict {
  name: string;
  endpoints: number;
  status: 'ok' | 'reject' | 'CRASH' | 'zodfail' | 'fetcherr' | 'toobig';
  detail?: string;
}

async function getList(): Promise<Record<string, any>> {
  const res = await fetch(LIST_URL);
  return (await res.json()) as Record<string, any>;
}

/** One spec per provider, spread across the alphabet for diversity. */
function pickSample(list: Record<string, any>, n: number): Entry[] {
  const byProvider = new Map<string, Entry>();
  for (const [key, api] of Object.entries(list)) {
    const provider = key.split(':')[0]!;
    if (byProvider.has(provider)) continue;
    const v = (api as any).versions?.[(api as any).preferred];
    const url: string | undefined = v?.swaggerYamlUrl ?? v?.swaggerUrl;
    if (url) byProvider.set(provider, { name: key, url });
  }
  const all = [...byProvider.values()].sort((a, b) => a.name.localeCompare(b.name));
  if (all.length <= n) return all;
  const step = Math.floor(all.length / n);
  const out: Entry[] = [];
  for (let i = 0; i < all.length && out.length < n; i += step) out.push(all[i]!);
  return out;
}

const CONFIG: GenerateRequest['config'] = {
  mcpName: 'corpus',
  baseUrl: 'https://example.test',
  upstreamAuth: { type: 'none' },
  mode: 'both',
  includeParamDescriptions: true,
  retryOnServerError: false,
};

async function checkOne(entry: Entry): Promise<Verdict> {
  let raw: string;
  try {
    const res = await fetch(entry.url);
    raw = await res.text();
  } catch (err) {
    return { name: entry.name, endpoints: 0, status: 'fetcherr', detail: msg(err) };
  }
  const sizeBytes = Buffer.byteLength(raw);
  if (sizeBytes > MAX_BYTES) return { name: entry.name, endpoints: 0, status: 'toobig' };

  let parsed;
  try {
    parsed = await parseSpec(raw, { sizeBytes });
  } catch (err) {
    if (err instanceof ParseError) {
      return { name: entry.name, endpoints: 0, status: 'reject', detail: err.code };
    }
    return { name: entry.name, endpoints: 0, status: 'CRASH', detail: `parse: ${msg(err)}` };
  }

  const ids = parsed.groups.flatMap((g) => g.endpoints.map((e) => e.id)).slice(0, MAX_ENDPOINTS);
  if (ids.length === 0) return { name: entry.name, endpoints: 0, status: 'reject', detail: 'no endpoints' };

  let files;
  try {
    const req: GenerateRequest = { parsedSpec: parsed, rawSpec: raw, selectedIds: ids, config: CONFIG };
    files = generateMcp(req);
  } catch (err) {
    return { name: entry.name, endpoints: ids.length, status: 'CRASH', detail: `generate: ${msg(err)}` };
  }

  // The dynamic surface is the per-tool inputSchema. Verify each one actually
  // constructs as a Zod raw shape — this catches malformed/throwing Zod.
  const toolsFile = files.find((f) => f.path === 'src/tools.ts')?.content ?? '';
  for (const expr of extractInputSchemas(toolsFile)) {
    try {
      const shape = new Function('z', `return (${expr})`)(z) as Record<string, unknown>;
      z.object(shape as Record<string, z.ZodTypeAny>); // SDK wraps it like this
    } catch (err) {
      return {
        name: entry.name,
        endpoints: ids.length,
        status: 'zodfail',
        detail: `${msg(err)} :: ${expr.slice(0, 160)}`,
      };
    }
  }
  return { name: entry.name, endpoints: ids.length, status: 'ok' };
}

/** Pull each `{{{inputSchema}}}` rendered as the 4th arg to server.tool(...). */
function extractInputSchemas(tools: string): string[] {
  const out: string[] = [];
  const re = /server\.tool\([\s\S]*?,\s*'[^']*',\s*(\{[\s\S]*?\}),\s*\n\s*async/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tools)) !== null) out.push(m[1]!);
  return out;
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function main() {
  const n = Number(process.argv[2] ?? 40);
  process.stdout.write(`Fetching APIs.guru directory…\n`);
  const list = await getList();
  const sample = pickSample(list, n);
  process.stdout.write(`Checking ${sample.length} specs (of ${Object.keys(list).length} APIs)\n\n`);

  const results: Verdict[] = [];
  for (const entry of sample) {
    const v = await checkOne(entry);
    results.push(v);
    const mark = v.status === 'ok' ? '·' : v.status === 'CRASH' || v.status === 'zodfail' ? '✗' : '–';
    process.stdout.write(`${mark} ${v.status.padEnd(8)} ${v.name}${v.detail ? `  (${v.detail})` : ''}\n`);
  }

  const by = (s: Verdict['status']) => results.filter((r) => r.status === s);
  const bugs = [...by('CRASH'), ...by('zodfail')];
  process.stdout.write(
    `\n=== SUMMARY ===\n` +
      `ok      ${by('ok').length}\n` +
      `reject  ${by('reject').length} (graceful — typed ParseError)\n` +
      `toobig  ${by('toobig').length}\n` +
      `fetcherr ${by('fetcherr').length}\n` +
      `BUGS    ${bugs.length} (CRASH + zodfail)\n`
  );
  if (bugs.length > 0) {
    process.stdout.write(`\n=== BUGS TO FIX ===\n`);
    for (const b of bugs) process.stdout.write(`✗ [${b.status}] ${b.name}\n   ${b.detail}\n`);
  }
}

main().catch((err) => {
  process.stderr.write(`fatal: ${msg(err)}\n`);
  process.exit(1);
});

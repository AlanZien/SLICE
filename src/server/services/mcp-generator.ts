import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import type { GenerateRequest, GeneratedFile } from '@shared/types';

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(HERE, '../templates');

/**
 * Map of source template → destination path in the ZIP. Keeping this as a
 * static table avoids glob-magic and makes "what's in the bundle?" answerable
 * in one place.
 */
interface TemplateBinding {
  /** Filename inside `src/server/templates/`. */
  source: string;
  /** Path emitted in the generated ZIP, relative to the package root. */
  dest: string;
}

const STATIC_TEMPLATES: ReadonlyArray<TemplateBinding> = [
  { source: 'package.json.hbs', dest: 'package.json' },
  { source: 'tsconfig.json.hbs', dest: 'tsconfig.json' },
  { source: 'env.example.hbs', dest: '.env.example' },
  { source: 'gitignore.hbs', dest: '.gitignore' },
];

// Register helpers exactly once at module load — Handlebars treats helpers
// as global state, so re-registering on every render is wasteful.
let helpersRegistered = false;
function registerHelpers(): void {
  if (helpersRegistered) return;
  helpersRegistered = true;

  // `{{#ifEquals a b}}…{{/ifEquals}}` — strict equality block helper.
  Handlebars.registerHelper('ifEquals', function (this: unknown, a: unknown, b: unknown, options) {
    // `options.fn` only exists on block helpers — the cast keeps the call site
    // legible without a separate type guard.
    const opts = options as unknown as Handlebars.HelperOptions;
    return a === b ? opts.fn(this) : opts.inverse(this);
  });
}

// Compile each template once and cache. Templates are loaded synchronously
// at first call — they live in the same tree as the server code, so disk
// I/O cost is negligible and predictable.
const templateCache = new Map<string, Handlebars.TemplateDelegate>();
function compileTemplate(source: string): Handlebars.TemplateDelegate {
  let compiled = templateCache.get(source);
  if (!compiled) {
    const raw = readFileSync(resolve(TEMPLATES_DIR, source), 'utf-8');
    compiled = Handlebars.compile(raw, { noEscape: true });
    templateCache.set(source, compiled);
  }
  return compiled;
}

interface TemplateContext {
  mcpName: string;
  apiName: string;
  apiVersion: string;
  baseUrl: string;
  upstreamAuth: { type: string; headerName?: string };
  mode: string;
  modeLocalOnly: boolean;
  mcpServerToken?: string;
}

function buildContext(req: GenerateRequest): TemplateContext {
  const { parsedSpec, config } = req;
  return {
    mcpName: config.mcpName,
    apiName: parsedSpec.apiName,
    apiVersion: parsedSpec.apiVersion,
    baseUrl: config.baseUrl,
    upstreamAuth: config.upstreamAuth,
    mode: config.mode,
    modeLocalOnly: config.mode === 'local',
    mcpServerToken: config.mode === 'local' ? undefined : config.mcpServerToken,
  };
}

/**
 * Build every file the user will see in their downloaded ZIP. Pure function:
 * same input → same output, no disk writes, no network. Phase 08 will stream
 * the returned files into an archive.
 */
export function generateMcp(req: GenerateRequest): GeneratedFile[] {
  registerHelpers();
  const ctx = buildContext(req);
  return STATIC_TEMPLATES.map((binding) => ({
    path: binding.dest,
    content: compileTemplate(binding.source)(ctx),
  }));
}

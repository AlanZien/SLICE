import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import type {
  Endpoint,
  EndpointParam,
  GenerateRequest,
  GeneratedFile,
} from '@shared/types';
import { buildZodExpression } from './zod-schema-builder';

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
  { source: 'http-client.ts.hbs', dest: 'src/http-client.ts' },
  { source: 'tools.ts.hbs', dest: 'src/tools.ts' },
];

interface ToolBinding {
  name: string;
  description: string;
  method: string;
  path: string;
  inputSchema: string;
  hasPathParams: boolean;
  pathParamsExpr: string;
  hasQuery: boolean;
  queryExpr: string;
  hasBody: boolean;
}

/**
 * Sanitise an endpoint into a JS-safe identifier the agent can call.
 * Same convention as the preview pane (phase 04bis) so what users see is
 * what they get.
 */
function toolNameFor(endpoint: Endpoint): string {
  return (
    endpoint.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'tool'
  );
}

function buildTool(endpoint: Endpoint, includeDescriptions: boolean): ToolBinding {
  const path = endpoint.params.filter((p: EndpointParam) => p.in === 'path');
  const query = endpoint.params.filter((p: EndpointParam) => p.in === 'query');

  // Tool input schema: object whose properties are the endpoint params.
  const properties: Record<string, ReturnType<typeof shapeOfParam>> = {};
  for (const p of endpoint.params) {
    properties[p.name] = shapeOfParam(p);
  }
  const inputSchema = buildZodExpression(
    {
      type: 'object',
      required: true,
      properties,
      requiredFields: endpoint.params.filter((p) => p.required).map((p) => p.name),
    },
    includeDescriptions
  );

  return {
    name: toolNameFor(endpoint),
    description: (endpoint.description ?? endpoint.label).replace(/'/g, "\\'").split('\n')[0],
    method: endpoint.method,
    path: endpoint.path,
    inputSchema,
    hasPathParams: path.length > 0,
    pathParamsExpr: path.map((p) => `${p.name}: String(args.${p.name})`).join(', '),
    hasQuery: query.length > 0,
    queryExpr: query.map((p) => `${p.name}: args.${p.name}`).join(', '),
    hasBody: false, // Phase 07 ignores requestBody — phase 04 doesn't flatten it yet.
  };
}

function shapeOfParam(p: EndpointParam): {
  type?: string;
  required: boolean;
  description?: string;
} {
  return {
    type: p.type,
    required: p.required,
    description: p.description,
  };
}

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
  tools: ToolBinding[];
}

function buildContext(req: GenerateRequest): TemplateContext {
  const { parsedSpec, config, selectedIds } = req;
  const selectedSet = new Set(selectedIds);
  const tools = parsedSpec.groups
    .flatMap((g) => g.endpoints)
    .filter((e) => selectedSet.has(e.id))
    .map((e) => buildTool(e, config.includeParamDescriptions));
  return {
    mcpName: config.mcpName,
    apiName: parsedSpec.apiName,
    apiVersion: parsedSpec.apiVersion,
    baseUrl: config.baseUrl,
    upstreamAuth: config.upstreamAuth,
    mode: config.mode,
    modeLocalOnly: config.mode === 'local',
    mcpServerToken: config.mode === 'local' ? undefined : config.mcpServerToken,
    tools,
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

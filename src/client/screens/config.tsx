import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import type {
  ApproximationKind,
  DeploymentMode,
  Endpoint,
  ParsedSpec,
  SliceConfig,
  UpstreamAuthType,
} from '@shared/types';
import { computeEconomy } from '@shared/token-estimator';
import { AdvancedOptions } from '@/components/advanced-options';
import { AuthOption } from '@/components/auth-option';
import { DestCard } from '@/components/dest-card';
import { Field } from '@/components/field';
import { McpPackageCard } from '@/components/mcp-package-card';
import { PostGenSteps } from '@/components/post-gen-steps';
import { ToggleRow } from '@/components/toggle-row';
import { ZipStructurePreview } from '@/components/zip-structure-preview';
import { useConfig } from '@/hooks/use-config';
import { cn } from '@/lib/utils';

const SAMPLE_TOOL_COUNT = 6;

function transportLabelFor(mode: DeploymentMode): string {
  switch (mode) {
    case 'local':
      return 'stdio';
    case 'remote':
      return 'http';
    case 'both':
      return 'stdio + http';
  }
}

function authLabelFor(type: UpstreamAuthType): string {
  switch (type) {
    case 'none':
      return 'no auth';
    case 'apiKey':
      return 'api key';
    case 'bearer':
      return 'bearer';
    case 'oauth2':
      return 'OAuth 2.0';
  }
}

function toolIdFor(endpoint: Endpoint): string {
  const path = endpoint.path
    .replace(/^\/+/, '')
    .replace(/\{(\w+)\}/g, '$1')
    .replace(/[^a-zA-Z0-9_/]/g, '_')
    .replace(/\/+/g, '.')
    .replace(/\.+$/, '');
  return `tools.${endpoint.method.toLowerCase()}_${path || 'root'}`;
}

interface GenerationReportData {
  total: number;
  full: number;
  schemaFallback: number;
  nonJsonBody: number;
  cookieParam: number;
}

function GenerationReport({ report }: { report: GenerationReportData }) {
  const { total, full, schemaFallback, nonJsonBody, cookieParam } = report;
  const hasApprox = schemaFallback > 0 || nonJsonBody > 0 || cookieParam > 0;
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 font-mono text-xs text-muted-foreground space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-foreground font-medium">{total} / {total} endpoints in MCP</span>
        {!hasApprox && <span className="text-emerald-500">· All fully supported</span>}
      </div>
      {hasApprox && (
        <ul className="space-y-0.5 pl-1">
          <li>✓ {full} fully supported</li>
          {schemaFallback > 0 && (
            <li>⚠ {schemaFallback} with approximated schema (oneOf / anyOf → string)</li>
          )}
          {nonJsonBody > 0 && (
            <li>⬜ {nonJsonBody} with no body support (non-JSON request body)</li>
          )}
          {cookieParam > 0 && (
            <li>🔒 {cookieParam} with cookie params (not transmitted at runtime)</li>
          )}
        </ul>
      )}
    </div>
  );
}

export interface ConfigScreenProps {
  spec: ParsedSpec;
  selectedIds: string[];
  onBack: () => void;
  onGenerate: (config: SliceConfig) => void;
}

const FALLBACK_DEFAULT = (spec: ParsedSpec) => ({
  mcpName: 'mcp-server',
  baseUrl: spec.baseUrl,
  upstreamAuth: { type: 'none' as const },
  mcpServerToken: '',
});

export function ConfigScreen({ spec, selectedIds, onBack, onGenerate }: ConfigScreenProps) {
  // Parser should always inject a defaultConfig in phase 06+, but stay
  // defensive in case an older payload reaches the screen.
  const defaults = spec.defaultConfig ?? FALLBACK_DEFAULT(spec);
  const { config, errors, isValid, setField, setUpstreamAuth } = useConfig(defaults);

  const detectedAuthType = defaults.upstreamAuth.type;

  // Pre-compute everything that depends on (spec, selectedIds) in a single memo.
  const { sampleTools, extraToolsCount, savedPercent, report } = useMemo(() => {
    const allEndpoints = spec.groups.flatMap((g) => g.endpoints);
    const selectedSet = new Set(selectedIds);
    const chosen = allEndpoints.filter((e) => selectedSet.has(e.id));

    const sample = chosen.slice(0, SAMPLE_TOOL_COUNT).map((e) => ({
      id: toolIdFor(e),
      method: e.method,
    }));
    const economy = computeEconomy(spec, selectedIds);

    let full = 0, schemaFallback = 0, nonJsonBody = 0, cookieParam = 0;
    for (const e of chosen) {
      const kinds = (e.approximations ?? []) as ApproximationKind[];
      if (kinds.length === 0) { full++; continue; }
      if (kinds.includes('schema_fallback')) schemaFallback++;
      if (kinds.includes('non_json_body')) nonJsonBody++;
      if (kinds.includes('cookie_param')) cookieParam++;
    }

    return {
      sampleTools: sample,
      extraToolsCount: Math.max(0, chosen.length - SAMPLE_TOOL_COUNT),
      savedPercent: economy.percent,
      report: { total: chosen.length, full, schemaFallback, nonJsonBody, cookieParam } satisfies GenerationReportData,
    };
  }, [spec, selectedIds]);

  const handleAuthSelect = (next: UpstreamAuthType) => {
    if (next === 'apiKey') {
      // Preserve the detected header name when we land back on apiKey,
      // otherwise default to a sensible header so the form stays valid.
      const headerName =
        defaults.upstreamAuth.type === 'apiKey'
          ? defaults.upstreamAuth.headerName ?? 'X-API-Key'
          : 'X-API-Key';
      setUpstreamAuth({ type: 'apiKey', headerName });
    } else if (next === 'bearer') {
      setUpstreamAuth({ type: 'bearer' });
    } else {
      setUpstreamAuth({ type: 'none' });
    }
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex min-h-0 flex-1">
        {/* LEFT — form */}
        <section className="flex-1 overflow-y-auto px-8 py-6">
          <div className="mx-auto flex max-w-xl flex-col gap-7">
            <header className="flex flex-col gap-1.5">
              <p className="eyebrow">Step 3 of 3 · configuration</p>
              <h2 className="h2 text-foreground">
                Give it a name and tell us where it'll live.
              </h2>
              <p className="font-mono text-xs text-muted-foreground">
                Pre-filled from your spec. Check, tweak if needed, then generate.
              </p>
            </header>

            <div className="flex flex-col gap-4">
              <Field
                label="MCP server name"
                value={config.mcpName}
                error={errors.mcpName}
                onChange={(v) => setField('mcpName', v)}
                mono
                prefix="@"
              />
              <Field
                label="Upstream API base URL"
                value={config.baseUrl}
                error={errors.baseUrl}
                onChange={(v) => setField('baseUrl', v)}
                mono
              />

              <div className="flex flex-col gap-2">
                <label className="eyebrow">Upstream authentication</label>
                {detectedAuthType !== 'none' ? (
                  // Auth was declared in the spec — pin it. Changing the
                  // scheme here would only produce an MCP that the upstream
                  // API rejects at runtime. If the spec is wrong, the user
                  // fixes it at the source rather than guessing in SLICE.
                  <div
                    role="status"
                    aria-label="Upstream authentication detected from the spec"
                    className="flex flex-col gap-1 rounded-md border border-border bg-card/40 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {detectedAuthType === 'apiKey'
                          ? 'API Key'
                          : detectedAuthType === 'oauth2'
                            ? 'Automatic connection (OAuth 2.0)'
                            : 'Bearer'}
                      </span>
                      <span className="ml-auto rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9.5px] uppercase tracking-wide text-emerald-500">
                        auto-detected
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {detectedAuthType === 'apiKey' && config.upstreamAuth.type === 'apiKey'
                        ? `header · ${config.upstreamAuth.headerName}`
                        : detectedAuthType === 'oauth2' && config.upstreamAuth.type === 'oauth2'
                          ? `token endpoint · ${config.upstreamAuth.tokenUrl}`
                          : 'Authorization: Bearer …'}
                    </span>
                    {detectedAuthType === 'oauth2' && (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        The server signs in by itself. Self-host: set
                        {' '}
                        <span className="text-foreground">UPSTREAM_OAUTH_CLIENT_ID</span> /{' '}
                        <span className="text-foreground">UPSTREAM_OAUTH_CLIENT_SECRET</span> in its env.
                      </span>
                    )}
                  </div>
                ) : (
                  // Spec declared nothing — let the user fill it in.
                  <>
                    <div className="flex flex-wrap gap-2">
                      <AuthOption
                        value="none"
                        active={config.upstreamAuth.type === 'none'}
                        onSelect={handleAuthSelect}
                        title="None"
                        hint="public API"
                      />
                      <AuthOption
                        value="apiKey"
                        active={config.upstreamAuth.type === 'apiKey'}
                        onSelect={handleAuthSelect}
                        title="API Key"
                        hint={
                          config.upstreamAuth.type === 'apiKey'
                            ? `header · ${config.upstreamAuth.headerName}`
                            : 'header-based token'
                        }
                      />
                      <AuthOption
                        value="bearer"
                        active={config.upstreamAuth.type === 'bearer'}
                        onSelect={handleAuthSelect}
                        title="Bearer"
                        hint="Authorization: Bearer …"
                      />
                    </div>
                    {errors.upstreamAuth && (
                      <span className="font-mono text-[11px] text-destructive">
                        {errors.upstreamAuth}
                      </span>
                    )}
                    {config.upstreamAuth.type === 'apiKey' && (
                      <Field
                        label="Header name"
                        value={config.upstreamAuth.headerName ?? ''}
                        onChange={(v) =>
                          setUpstreamAuth({ type: 'apiKey', headerName: v })
                        }
                        mono
                      />
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="eyebrow">the only real question</p>
              <h3 className="h2 text-foreground" style={{ fontSize: 22 }}>
                Where should we host it?
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <DestCard
                  value="cloud"
                  active={config.hosting === 'cloud'}
                  onSelect={(v) => setField('hosting', v)}
                  title="SLICE Cloud"
                  blurb="We host it for you — you get a ready URL to paste into your agent."
                  apps={['Claude', 'n8n', 'Airia']}
                  transport="hosted"
                  recommended
                />
                <DestCard
                  value="self"
                  active={config.hosting === 'self'}
                  onSelect={(v) => setField('hosting', v)}
                  title="On my server"
                  blurb="Download a ready-to-run kit and deploy it wherever you want."
                  apps={['Coolify', 'Railway', 'VPS']}
                  transport="self-host"
                />
              </div>
            </div>

            <AdvancedOptions summary="parameter detail, retries">
              <div className="flex flex-col gap-1">
                <ToggleRow
                  title="Detailed parameter descriptions"
                  hint="better for the agent, +12% context"
                  on={config.includeParamDescriptions}
                  onToggle={() =>
                    setField('includeParamDescriptions', !config.includeParamDescriptions)
                  }
                />
                <ToggleRow
                  title="Retry on 5xx"
                  hint="3 attempts, exponential backoff"
                  on={config.retryOnServerError}
                  onToggle={() =>
                    setField('retryOnServerError', !config.retryOnServerError)
                  }
                />
              </div>
            </AdvancedOptions>

            <GenerationReport report={report} />
          </div>
        </section>

        {/* RIGHT — live preview pane */}
        <aside className="flex w-[380px] shrink-0 flex-col gap-5 overflow-y-auto border-l border-border bg-card/30 p-6">
          <div className="flex items-center gap-2">
            <p className="eyebrow">Live preview</p>
            <span className="grow" />
            <span className="font-mono inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
              />
              sync
            </span>
          </div>

          <McpPackageCard
            name={config.mcpName}
            endpointCount={selectedIds.length}
            savedPercent={savedPercent}
            transportLabel={transportLabelFor(config.mode)}
            authLabel={authLabelFor(config.upstreamAuth.type)}
            sampleTools={sampleTools}
            extraToolsCount={extraToolsCount}
          />

          <ZipStructurePreview packageName={config.mcpName} mode={config.mode} />

          <PostGenSteps />
        </aside>
      </div>

      {/* Footer */}
      <footer className="sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--slice-highlight)] hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={!isValid}
          onClick={() => onGenerate(config)}
          className={cn(
            'font-mono inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity',
            isValid ? 'hover:opacity-90' : 'cursor-not-allowed opacity-40'
          )}
        >
          {config.hosting === 'self' ? 'Download the kit' : 'Deploy to SLICE Cloud'} →
        </button>
      </footer>
    </div>
  );
}

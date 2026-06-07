import { useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import type {
  ParsedSpec,
  SliceConfig,
  UpstreamAuthType,
} from '@shared/types';
import { computeEconomy, estimateSpecTokens } from '@shared/token-estimator';
import { AuthOption } from '@/components/auth-option';
import { ConnectionTabs } from '@/components/connection-tabs';
import { DestCard } from '@/components/dest-card';
import { Field } from '@/components/field';
import { PostGenSteps } from '@/components/post-gen-steps';
import { ZipStructurePreview } from '@/components/zip-structure-preview';
import { useConfig } from '@/hooks/use-config';
import { cn } from '@/lib/utils';

const PREVIEW_URL = 'https://slice.run/m/xxxxxxxx';



export interface ConfigScreenProps {
  spec: ParsedSpec;
  selectedIds: string[];
  onGenerate: (config: SliceConfig) => void;
}

const FALLBACK_DEFAULT = (spec: ParsedSpec) => ({
  mcpName: 'mcp-server',
  baseUrl: spec.baseUrl,
  upstreamAuth: { type: 'none' as const },
  mcpServerToken: '',
});

export function ConfigScreen({ spec, selectedIds, onGenerate }: ConfigScreenProps) {
  // Parser should always inject a defaultConfig in phase 06+, but stay
  // defensive in case an older payload reaches the screen.
  const defaults = spec.defaultConfig ?? FALLBACK_DEFAULT(spec);
  const { config, errors, isValid, setField, setUpstreamAuth } = useConfig(defaults);

  const detectedAuthType = defaults.upstreamAuth.type;
  const detectedBaseUrl = defaults.baseUrl;
  const [baseUrlLocked, setBaseUrlLocked] = useState(!!detectedBaseUrl);

  const { savedPercent, sliceTokens, fullTokens, totalCount } = useMemo(() => {
    const allEndpoints = spec.groups.flatMap((g) => g.endpoints);
    const economy = computeEconomy(spec, selectedIds);
    return {
      savedPercent: economy.percent,
      sliceTokens: economy.selected,
      fullTokens: estimateSpecTokens(spec),
      totalCount: allEndpoints.length,
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
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        {/* LEFT — form */}
        <section className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mx-auto flex max-w-xl flex-col gap-4">
            <header className="flex flex-col gap-1">
              <h2 className="h2 text-foreground">
                Give it a name and tell us where it'll live.
              </h2>
              <p className="font-mono text-xs text-muted-foreground">
                Pre-filled from your spec. Check, tweak if needed, then generate.
              </p>
            </header>

            <div className="flex flex-col gap-3">
              <Field
                label="MCP server name"
                value={config.mcpName}
                error={errors.mcpName}
                onChange={(v) => setField('mcpName', v)}
                mono
                prefix="@"
              />
              {detectedBaseUrl && baseUrlLocked ? (
                <div className="flex flex-col gap-2">
                  <label className="eyebrow">Upstream API base URL</label>
                  <div
                    role="status"
                    aria-label="Base URL detected from the spec"
                    className="flex items-center gap-2 rounded-md border border-border bg-card/40 px-3 py-2.5"
                  >
                    <span className="font-mono text-sm text-foreground min-w-0 flex-1 truncate">{detectedBaseUrl}</span>
                    <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9.5px] uppercase tracking-wide text-primary">
                      auto-detected
                    </span>
                    <button
                      type="button"
                      onClick={() => setBaseUrlLocked(false)}
                      aria-label="Edit base URL"
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <Field
                  label="Upstream API base URL"
                  value={config.baseUrl}
                  error={errors.baseUrl}
                  onChange={(v) => setField('baseUrl', v)}
                  mono
                />
              )}

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
                    className="flex items-center gap-2 rounded-md border border-border bg-card/40 px-3 py-2.5"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {detectedAuthType === 'apiKey'
                        ? 'API Key'
                        : detectedAuthType === 'oauth2'
                          ? 'Automatic connection (OAuth 2.0)'
                          : 'Bearer'}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {'· '}
                      {detectedAuthType === 'apiKey' && config.upstreamAuth.type === 'apiKey'
                        ? `header · ${config.upstreamAuth.headerName}`
                        : detectedAuthType === 'oauth2' && config.upstreamAuth.type === 'oauth2'
                          ? `token endpoint · ${config.upstreamAuth.tokenUrl}`
                          : 'Authorization: Bearer …'}
                    </span>
                    <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9.5px] uppercase tracking-wide text-primary">
                      auto-detected
                    </span>
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

            <div className="mt-3 flex flex-col gap-2">
              <h3 className="h2 text-foreground" style={{ fontSize: 18 }}>
                Where should we host it?
              </h3>
              <div className="grid grid-cols-2 gap-2">
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

          </div>
        </section>

        {/* RIGHT — live preview pane */}
        <aside className="flex w-[380px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-border bg-card/30 p-4">
          {/* Overview — même résumé que l'écran 2 */}
          {(() => {
            const safePercent = Number.isFinite(savedPercent) ? Math.max(0, Math.min(100, savedPercent)) : 0;
            return (
              <div className="flex flex-col gap-4">
                <section className="flex flex-col gap-2">
                  <p className="eyebrow">Context saved</p>
                  <p className="h2 leading-none text-foreground">
                    −{safePercent}<span className="font-mono text-sm text-muted-foreground">%</span>
                  </p>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-border/60">
                    <div className="h-full bg-primary transition-[width]" style={{ width: `${safePercent}%` }} aria-hidden />
                  </div>
                </section>
                <div className="h-px bg-border/60" aria-hidden />
                <section className="flex flex-col gap-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="eyebrow">Selected</span>
                    <span className="font-mono tabular-nums text-xs text-foreground">
                      {selectedIds.length}<span className="text-muted-foreground"> / {totalCount}</span>
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="eyebrow">Tokens</span>
                    <span className="font-mono tabular-nums text-xs text-foreground">
                      {sliceTokens.toLocaleString()}<span className="text-muted-foreground"> / {fullTokens.toLocaleString()}</span>
                    </span>
                  </div>
                </section>
              </div>
            );
          })()}

          {config.hosting === 'cloud' ? (
            <>
              <div className="h-px bg-border/60" aria-hidden />
              <div className="flex flex-col gap-2">
                <p className="eyebrow">Snippet preview</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Real URL replaces <span className="text-foreground">xxxxxxxx</span> after deploy.
                </p>
                <ConnectionTabs config={config} hostedUrl={PREVIEW_URL} />
              </div>
            </>
          ) : (
            <>
              <PostGenSteps />
              <ZipStructurePreview packageName={config.mcpName} mode={config.mode} />
            </>
          )}
        </aside>
      </div>

      {/* Footer */}
      <footer className="sticky bottom-0 z-10 flex items-center justify-end gap-4 border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
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

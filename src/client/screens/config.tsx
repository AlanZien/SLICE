import { ArrowLeft } from 'lucide-react';
import type { ParsedSpec, SliceConfig, UpstreamAuthType } from '@shared/types';
import { AdvancedOptions } from '@/components/advanced-options';
import { AuthOption } from '@/components/auth-option';
import { DestCard } from '@/components/dest-card';
import { Field } from '@/components/field';
import { ToggleRow } from '@/components/toggle-row';
import { useConfig } from '@/hooks/use-config';
import { cn } from '@/lib/utils';

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
                hint="auto-detected from the spec title"
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
                    detected={detectedAuthType === 'apiKey'}
                  />
                  <AuthOption
                    value="bearer"
                    active={config.upstreamAuth.type === 'bearer'}
                    onSelect={handleAuthSelect}
                    title="Bearer"
                    hint="Authorization: Bearer …"
                    detected={detectedAuthType === 'bearer'}
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
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="eyebrow">the only real question</p>
              <h3 className="h2 text-foreground" style={{ fontSize: 22 }}>
                Where will your agent use it?
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <DestCard
                  value="local"
                  active={config.mode === 'local'}
                  onSelect={(v) => setField('mode', v)}
                  title="On my machine"
                  blurb="The agent reads your MCP locally."
                  apps={['Claude Desktop', 'Cursor', 'Windsurf']}
                  transport="stdio"
                />
                <DestCard
                  value="remote"
                  active={config.mode === 'remote'}
                  onSelect={(v) => setField('mode', v)}
                  title="On a remote server"
                  blurb="The MCP is exposed over HTTP, reachable from any cloud agent."
                  apps={['n8n', 'Airia', 'Zapier']}
                  transport="http"
                />
                <DestCard
                  value="both"
                  active={config.mode === 'both'}
                  onSelect={(v) => setField('mode', v)}
                  title="Both"
                  blurb="We generate both modes side-by-side."
                  apps={['local + remote']}
                  transport="stdio + http"
                  recommended
                />
              </div>
            </div>

            <AdvancedOptions summary="HTTP token, parameter detail, retries">
              <div className="flex flex-col gap-1">
                {config.mode !== 'local' && (
                  <Field
                    label="MCP server token"
                    hint="auto-generated · injected into the .env"
                    value={config.mcpServerToken ?? ''}
                    onChange={(v) => setField('mcpServerToken', v)}
                    error={errors.mcpServerToken}
                    mono
                  />
                )}
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
          </div>
        </section>

        {/* RIGHT — preview placeholder (wave 2: McpPackageCard + ZipStructure + PostGenSteps) */}
        <aside className="hidden w-[380px] flex-col border-l border-border bg-card/30 p-6 lg:flex">
          <p className="eyebrow">live preview</p>
          <p className="font-mono mt-4 text-xs text-muted-foreground">
            {selectedIds.length} endpoints will ship. Detailed preview lands in
            the next iteration of this screen.
          </p>
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
          Generate my MCP →
        </button>
      </footer>
    </div>
  );
}

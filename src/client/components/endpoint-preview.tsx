import { useState } from 'react';
import type { Endpoint } from '@shared/types';
import { MethodBadge } from './method-badge';
import { cn } from '@/lib/utils';

export interface EndpointPreviewProps {
  endpoint: Endpoint | null;
  estimatedTokens: number;
  savedPercent: number;
  selectedCount: number;
  totalCount: number;
  sliceTokens: number;
  fullTokens: number;
  className?: string;
}

type Tab = 'overview' | 'endpoint';

export function EndpointPreview({
  endpoint,
  estimatedTokens,
  savedPercent,
  selectedCount,
  totalCount,
  sliceTokens,
  fullTokens,
  className,
}: EndpointPreviewProps) {
  const [tab, setTab] = useState<Tab>('endpoint');
  const safePercent = Number.isFinite(savedPercent) ? Math.max(0, Math.min(100, savedPercent)) : 0;

  return (
    <aside
      className={cn(
        'flex w-[290px] flex-col border-l border-border bg-card/40',
        className
      )}
    >
      {/* Tabs */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-4 py-[14px]">
        {(['overview', 'endpoint'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              'font-mono inline-flex h-7 items-center rounded-full px-3 text-[11px] capitalize transition-colors',
              tab === t
                ? 'bg-foreground text-background'
                : 'border border-border bg-card/40 text-muted-foreground hover:border-primary hover:text-foreground'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <section className="flex flex-col gap-2">
            <p className="eyebrow">Agent scope</p>
            <p className="h2 leading-none text-foreground">
              {selectedCount}
              <span className="font-mono text-sm text-muted-foreground"> / {totalCount} endpoints</span>
            </p>
            <div className="h-1 w-full overflow-hidden rounded-full bg-border/60">
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${totalCount > 0 ? Math.round((selectedCount / totalCount) * 100) : 0}%` }}
                aria-hidden
              />
            </div>
            <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
              Unchecked endpoints don't exist in your server — your agent can't call them.
            </p>
          </section>

          <div className="h-px bg-border/60" aria-hidden />

          <section className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between">
              <span className="eyebrow">Context saved</span>
              <span className="font-mono tabular-nums text-xs text-foreground">
                −{safePercent}<span className="text-muted-foreground">%</span>
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
      )}

      {tab === 'endpoint' && !endpoint && (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <p className="font-mono text-xs text-muted-foreground">
            Select an endpoint to see its details.
          </p>
        </div>
      )}

      {tab === 'endpoint' && endpoint && (
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <div className="flex items-center gap-2">
            <MethodBadge method={endpoint.method} />
            <span className="font-mono truncate text-xs text-foreground" title={endpoint.path}>
              {endpoint.path}
            </span>
          </div>
          <h3 className="h3 text-foreground">{endpoint.label}</h3>
          {endpoint.description && (
            <p className="font-mono text-xs leading-relaxed text-muted-foreground">
              {endpoint.description}
            </p>
          )}

          <div className="my-1 h-px bg-border/60" aria-hidden />

          <section className="flex flex-col gap-1.5">
            <p className="eyebrow">Parameters</p>
            {endpoint.params.length === 0 ? (
              <p className="font-mono text-xs text-muted-foreground">No parameters</p>
            ) : (
              <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
                {endpoint.params.map((p) => (
                  <div key={`${p.in}:${p.name}`} className="flex flex-col gap-0.5">
                    <span className="font-mono text-[11px] text-foreground">{p.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {p.type ?? 'string'} · {p.required ? 'required' : 'optional'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="my-1 h-px bg-border/60" aria-hidden />

          <section className="flex flex-col gap-1">
            <p className="eyebrow">Context cost</p>
            <p className="font-mono text-lg text-foreground">~ {estimatedTokens} tokens</p>
          </section>
        </div>
      )}
    </aside>
  );
}

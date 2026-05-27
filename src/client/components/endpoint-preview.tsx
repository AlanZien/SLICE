import type { Endpoint } from '@shared/types';
import { MethodBadge } from './method-badge';
import { cn } from '@/lib/utils';

export interface EndpointPreviewProps {
  /** Currently focused endpoint, or null when nothing is focused yet. */
  endpoint: Endpoint | null;
  /** Whether the focused endpoint is in the selection. */
  selected: boolean;
  /** Tokens this endpoint contributes (computed by the parent via token-estimator). */
  estimatedTokens: number;
  /** Toggle the endpoint's selection — receives the endpoint id. */
  onToggle: (id: string) => void;
  className?: string;
}

export function EndpointPreview({
  endpoint,
  selected,
  estimatedTokens,
  onToggle,
  className,
}: EndpointPreviewProps) {
  if (!endpoint) {
    return (
      <aside
        className={cn(
          'flex w-[290px] flex-col items-center justify-center border-l border-border bg-card/40 p-6 text-center',
          className
        )}
      >
        <p className="font-mono text-xs text-muted-foreground">
          Select an endpoint to see its details.
        </p>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        'flex w-[290px] flex-col gap-3 overflow-y-auto border-l border-border bg-card/40 p-4',
        className
      )}
    >
      <p className="eyebrow">Preview</p>
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
          endpoint.params.map((p) => (
            <div key={`${p.in}:${p.name}`} className="font-mono flex justify-between text-[11px]">
              <span className="text-foreground">{p.name}</span>
              <span className="text-muted-foreground">
                {p.type ?? 'string'} · {p.required ? 'required' : 'optional'}
              </span>
            </div>
          ))
        )}
      </section>

      <div className="my-1 h-px bg-border/60" aria-hidden />

      <section className="flex flex-col gap-1">
        <p className="eyebrow">Context cost</p>
        <p className="font-mono text-lg text-foreground">~ {estimatedTokens} tokens</p>
      </section>

      <div className="grow" />

      <button
        type="button"
        onClick={() => onToggle(endpoint.id)}
        className={cn(
          'font-mono inline-flex h-9 items-center justify-center rounded-md text-xs font-medium transition-colors',
          selected
            ? 'border border-border bg-card text-muted-foreground hover:text-foreground'
            : 'bg-primary text-primary-foreground hover:opacity-90'
        )}
      >
        {selected ? '✓ Included in MCP' : '+ Add to MCP'}
      </button>
    </aside>
  );
}

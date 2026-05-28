import { cn } from '@/lib/utils';

export interface DestCardProps<V extends string> {
  value: V;
  active: boolean;
  onSelect: (value: V) => void;
  title: string;
  blurb: string;
  /** Apps that fit this deployment mode (Claude Desktop, n8n, etc.). */
  apps: ReadonlyArray<string>;
  /** Short transport label rendered in the bottom-right corner. */
  transport: string;
  /** Show a "Recommended" ribbon. */
  recommended?: boolean;
  className?: string;
}

export function DestCard<V extends string>({
  value,
  active,
  onSelect,
  title,
  blurb,
  apps,
  transport,
  recommended,
  className,
}: DestCardProps<V>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(value)}
      className={cn(
        'relative flex flex-col gap-3 rounded-lg border p-4 text-left transition-colors',
        active
          ? 'border-foreground bg-[var(--slice-highlight)]'
          : 'border-border bg-card/40 hover:border-primary',
        className
      )}
    >
      {recommended && (
        <span className="absolute -top-2 right-3 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-500">
          Recommended
        </span>
      )}
      <span
        aria-hidden
        className={cn(
          'inline-block h-2.5 w-2.5 self-end rounded-full border',
          active ? 'border-foreground bg-foreground' : 'border-border'
        )}
      />
      <div className="flex flex-col gap-1">
        <span className="text-base font-medium text-foreground">{title}</span>
        <span className="font-mono text-[11px] leading-relaxed text-muted-foreground">{blurb}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {apps.map((app) => (
          <span
            key={app}
            className="font-mono rounded border border-border bg-background/40 px-1.5 py-0.5 text-[10px] text-muted-foreground"
          >
            {app}
          </span>
        ))}
      </div>
      <span className="font-mono absolute bottom-2 right-3 text-[9.5px] tracking-widest text-muted-foreground/70">
        {transport}
      </span>
    </button>
  );
}

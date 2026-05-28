import { cn } from '@/lib/utils';

export interface AuthOptionProps<V extends string> {
  value: V;
  active: boolean;
  onSelect: (value: V) => void;
  title: string;
  hint?: string;
  /** Show an "auto" chip when this option matches what we detected in the spec. */
  detected?: boolean;
  className?: string;
}

export function AuthOption<V extends string>({
  value,
  active,
  onSelect,
  title,
  hint,
  detected,
  className,
}: AuthOptionProps<V>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(value)}
      className={cn(
        'relative flex min-w-[160px] flex-1 flex-col gap-1 rounded-md border px-3 py-2.5 text-left transition-colors',
        active
          ? 'border-foreground bg-[var(--slice-highlight)] text-foreground'
          : 'border-border bg-card/40 text-foreground hover:border-primary',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            'inline-block h-2.5 w-2.5 rounded-full border',
            active ? 'border-foreground bg-foreground' : 'border-border'
          )}
        />
        <span className="text-sm font-medium">{title}</span>
        {detected && (
          <span className="ml-auto rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-emerald-500">
            auto
          </span>
        )}
      </div>
      {hint && <span className="font-mono text-[11px] text-muted-foreground">{hint}</span>}
    </button>
  );
}

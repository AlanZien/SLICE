import { cn } from '@/lib/utils';

export type FilterMode = 'all' | 'read' | 'write';

export interface FilterChipsProps {
  value: FilterMode;
  onChange: (mode: FilterMode) => void;
  className?: string;
}

const MODES: Array<{ key: FilterMode; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'read', label: 'Reads' },
  { key: 'write', label: 'Writes' },
];

export function FilterChips({ value, onChange, className }: FilterChipsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {MODES.map((m) => {
        const active = value === m.key;
        return (
          <button
            key={m.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(m.key)}
            className={cn(
              'font-mono inline-flex h-7 items-center rounded-full px-3 text-[11px] transition-colors',
              active
                ? 'bg-foreground text-background'
                : 'border border-border bg-card/40 text-muted-foreground hover:border-primary hover:text-foreground'
            )}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

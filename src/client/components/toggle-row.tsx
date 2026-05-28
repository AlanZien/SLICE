import { cn } from '@/lib/utils';

export interface ToggleRowProps {
  title: string;
  hint?: string;
  on: boolean;
  onToggle: () => void;
  className?: string;
}

export function ToggleRow({ title, hint, on, onToggle, className }: ToggleRowProps) {
  return (
    <div className={cn('flex items-center gap-3 py-1.5', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={cn(
          'relative inline-flex h-[18px] w-[30px] shrink-0 items-center rounded-full border transition-colors',
          on
            ? 'border-foreground bg-foreground'
            : 'border-border bg-card/40'
        )}
      >
        <span
          className={cn(
            'block h-3 w-3 rounded-full transition-[left]',
            on ? 'bg-background' : 'bg-muted-foreground'
          )}
          style={{ position: 'absolute', top: 2, left: on ? 14 : 2 }}
        />
      </button>
      <div className="flex flex-col">
        <span className="text-sm text-foreground">{title}</span>
        {hint && (
          <span className="font-mono text-[11px] text-muted-foreground">{hint}</span>
        )}
      </div>
    </div>
  );
}

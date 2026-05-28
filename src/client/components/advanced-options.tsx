import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface AdvancedOptionsProps {
  /** Optional summary text shown next to the trigger label. */
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export function AdvancedOptions({
  summary,
  defaultOpen = false,
  children,
  className,
}: AdvancedOptionsProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('rounded-md border border-border bg-card/40', className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span
          className={cn(
            'inline-block text-xs text-muted-foreground transition-transform',
            open && 'rotate-90'
          )}
        >
          ▸
        </span>
        <span className="font-mono text-sm text-foreground">⚙ Advanced options</span>
        {summary && (
          <span className="font-mono text-[11px] text-muted-foreground">· {summary}</span>
        )}
      </button>
      {open && (
        <div className="border-t border-border/60 px-3 py-2">{children}</div>
      )}
    </div>
  );
}

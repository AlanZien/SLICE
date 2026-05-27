import { cn } from '@/lib/utils';

export interface EconomyCounterProps {
  /** Percentage in `[0, 100]`. Values outside the range are clamped. */
  percent: number;
  className?: string;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function EconomyCounter({ percent, className }: EconomyCounterProps) {
  const bounded = Math.round(clamp(percent, 0, 100));
  return (
    <div
      aria-label="context saved"
      className={cn(
        'rounded-md border border-border/60 bg-background/40 p-3 text-center',
        className
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        Context saved
      </p>
      <p className="h2 mt-1 text-foreground">{bounded}%</p>
      <p className="font-mono text-[10px] text-muted-foreground">
        vs. exposing the full spec
      </p>
    </div>
  );
}

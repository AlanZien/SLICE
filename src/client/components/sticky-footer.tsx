import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StickyFooterProps {
  selectedCount: number;
  savedPercent: number;
  onBack: () => void;
  onContinue: () => void;
  className?: string;
}

export function StickyFooter({
  selectedCount,
  savedPercent,
  onBack,
  onContinue,
  className,
}: StickyFooterProps) {
  const disabled = selectedCount === 0;
  const summaryClass =
    savedPercent >= 50 ? 'text-emerald-500' : savedPercent >= 25 ? 'text-amber-500' : 'text-muted-foreground';

  return (
    <footer
      className={cn(
        'sticky bottom-0 z-10 flex items-center gap-4 border-t border-border bg-background/95 px-6 py-3 backdrop-blur',
        className
      )}
    >
      <button
        type="button"
        onClick={onBack}
        className="font-mono inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs text-muted-foreground transition-colors hover:bg-[var(--slice-highlight)] hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>
      <div className="grow" />
      <p className="font-mono text-xs text-muted-foreground">
        <span className="text-foreground">{selectedCount}</span>
        <span> endpoints · </span>
        <span className={summaryClass}>−{savedPercent}%</span>
        <span> context</span>
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={onContinue}
        className={cn(
          'font-mono inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground transition-opacity',
          disabled ? 'cursor-not-allowed opacity-40' : 'hover:opacity-90'
        )}
      >
        Continue
        <kbd className="font-mono inline-flex h-5 items-center rounded border border-primary-foreground/30 px-1 text-[10px]">
          ↵
        </kbd>
      </button>
    </footer>
  );
}

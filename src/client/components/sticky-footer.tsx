import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StickyFooterProps {
  selectedCount: number;
  onBack: () => void;
  onContinue: () => void;
  className?: string;
}

export function StickyFooter({
  selectedCount,
  onBack,
  onContinue,
  className,
}: StickyFooterProps) {
  const disabled = selectedCount === 0;

  return (
    <footer
      className={cn(
        'sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t border-border bg-background/95 px-6 py-3 backdrop-blur',
        className
      )}
    >
      {/* Icon-only Back. The route back to upload is destructive (reset);
          users hit Recommencer in the topbar 99% of the time. Keep the
          affordance discoverable but not competing visually with Continue. */}
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

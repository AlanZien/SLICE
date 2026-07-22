import { cn } from '@/lib/utils';

export interface StickyFooterProps {
  selectedCount: number;
  onContinue: () => void;
  className?: string;
}

export function StickyFooter({
  selectedCount,
  onContinue,
  className,
}: StickyFooterProps) {
  const disabled = selectedCount === 0;

  return (
    <footer
      className={cn(
        'sticky bottom-0 z-10 flex items-center justify-end gap-4 border-t border-border bg-background/95 px-6 py-3 backdrop-blur',
        className
      )}
    >
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

import { cn } from '@/lib/utils';

export interface SelectionSidebarProps {
  selectedCount: number;
  totalCount: number;
  onContinue: () => void;
  /** Optional context-saved percentage (phase 05 will wire it). */
  savedPercent?: number | null;
  className?: string;
}

export function SelectionSidebar({
  selectedCount,
  totalCount,
  onContinue,
  savedPercent = null,
  className,
}: SelectionSidebarProps) {
  const disabled = selectedCount === 0;
  return (
    <aside
      className={cn(
        'sticky top-4 flex w-full flex-col gap-4 rounded-lg border border-border bg-card/40 p-4',
        className
      )}
    >
      <p className="eyebrow">Selection</p>

      <p className="font-mono text-xs text-muted-foreground">
        {`${selectedCount} / ${totalCount} endpoints`}
      </p>

      <div aria-label="context saved" className="rounded-md border border-border/60 bg-background/40 p-3 text-center">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Context saved
        </p>
        <p className="h2 mt-1 text-foreground">
          {savedPercent === null ? '—' : `${savedPercent}%`}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {savedPercent === null
            ? 'calibrating in next phase'
            : 'vs. exposing the full spec'}
        </p>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={onContinue}
        className={cn(
          'font-mono inline-flex h-9 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-opacity',
          disabled ? 'cursor-not-allowed opacity-40' : 'hover:opacity-90'
        )}
      >
        Continue
      </button>
    </aside>
  );
}

import { cn } from '@/lib/utils';
import { EconomyCounter } from './economy-counter';

export interface SelectionSidebarProps {
  selectedCount: number;
  totalCount: number;
  onContinue: () => void;
  /** Optional context-saved percentage (phase 05 will wire it). */
  savedPercent?: number | null;
  /** Endpoints dropped by the parser for missing metadata (12.b). */
  excludedCount?: number;
  /** Whether deprecated endpoints are currently visible (12.c). */
  showDeprecated?: boolean;
  /** Toggle deprecated visibility (12.c). Omit to hide the toggle. */
  onToggleDeprecated?: () => void;
  /** How many deprecated endpoints exist (drives the toggle visibility). */
  deprecatedCount?: number;
  className?: string;
}

export function SelectionSidebar({
  selectedCount,
  totalCount,
  onContinue,
  savedPercent = null,
  excludedCount = 0,
  showDeprecated = false,
  onToggleDeprecated,
  deprecatedCount = 0,
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

      {excludedCount > 0 && (
        <p className="font-mono text-[10px] text-muted-foreground">
          {excludedCount} endpoint{excludedCount > 1 ? 's' : ''} excluded — missing description
        </p>
      )}

      {deprecatedCount > 0 && onToggleDeprecated && (
        <label className="font-mono flex cursor-pointer items-center gap-2 text-[10px] text-muted-foreground">
          <input
            type="checkbox"
            checked={showDeprecated}
            onChange={onToggleDeprecated}
            className="h-3 w-3 accent-primary"
          />
          Show deprecated ({deprecatedCount})
        </label>
      )}

      {savedPercent === null ? (
        <div aria-label="context saved" className="rounded-md border border-border/60 bg-background/40 p-3 text-center">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Context saved
          </p>
          <p className="h2 mt-1 text-foreground">—</p>
          <p className="font-mono text-[10px] text-muted-foreground">
            calibrating
          </p>
        </div>
      ) : (
        <EconomyCounter percent={savedPercent} />
      )}

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

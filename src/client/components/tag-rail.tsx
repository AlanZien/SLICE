import { cn } from '@/lib/utils';

export interface TagRailItem {
  name: string;
  picked: number;
  total: number;
}

export interface TagRailProps {
  tags: ReadonlyArray<TagRailItem>;
  /** Currently active tag name, or `null` for "All". */
  activeTag: string | null;
  /** Pass `null` to switch to "All". */
  onSelectTag: (tag: string | null) => void;
  /** Saved context percentage (0–100). */
  savedPercent: number;
  selectedCount: number;
  totalCount: number;
  /** Estimated tokens for the current selection. */
  sliceTokens: number;
  /** Estimated tokens for the full spec. */
  fullTokens: number;
  className?: string;
}

export function TagRail({
  tags,
  activeTag,
  onSelectTag,
  savedPercent,
  selectedCount,
  totalCount,
  sliceTokens,
  fullTokens,
  className,
}: TagRailProps) {
  const safePercent = Number.isFinite(savedPercent) ? Math.max(0, Math.min(100, savedPercent)) : 0;
  return (
    <aside
      className={cn(
        // `h-full min-h-0` is the key: it lets the tags-list flex-child
        // shrink so the savings footer stays visible at the bottom of the
        // viewport instead of being pushed off-screen by a long tag list.
        // Width matches the preview pane on the right (290px) so the central
        // list sits symmetrically between two equal-weight rails.
        'flex h-full min-h-0 w-[290px] flex-col border-r border-border bg-card/40',
        className
      )}
    >
      {/* No 'Tags' eyebrow — the list of tag names is self-evident. */}
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 pb-2 pt-3">
        <RailItem
          name="All"
          // Count intentionally omitted: it would just mirror the
          // "selected / total" line in the footer below.
          active={activeTag === null}
          onClick={() => onSelectTag(null)}
        />
        {tags.map((tag) => (
          <RailItem
            key={tag.name}
            name={tag.name}
            picked={tag.picked}
            total={tag.total}
            active={activeTag === tag.name}
            onClick={() => onSelectTag(tag.name)}
          />
        ))}
      </nav>

      <footer className="flex shrink-0 flex-col gap-1.5 border-t border-border/60 bg-background/40 px-3 py-2.5">
        <p className="eyebrow">Context saved</p>
        <p className="h2 leading-none text-foreground">
          −{safePercent}
          <span className="font-mono ml-1 text-sm text-muted-foreground">%</span>
        </p>
        <div className="h-1 w-full overflow-hidden rounded-full bg-border/60">
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${safePercent}%` }}
            aria-hidden
          />
        </div>
        <div className="font-mono mt-0.5 flex justify-between text-[10px] text-muted-foreground">
          <span>selected</span>
          <span>{`${selectedCount} / ${totalCount}`}</span>
        </div>
        <div className="font-mono flex justify-between text-[10px] text-muted-foreground">
          <span>tokens</span>
          <span>{`${sliceTokens} / ${fullTokens}`}</span>
        </div>
      </footer>
    </aside>
  );
}

interface RailItemProps {
  name: string;
  /** Omitted on the "All" item — its counts duplicate the rail footer. */
  picked?: number;
  total?: number;
  active: boolean;
  onClick: () => void;
}

function RailItem({ name, picked, total, active, onClick }: RailItemProps) {
  const showCount = typeof picked === 'number' && typeof total === 'number';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Tag: ${name}`}
      aria-current={active ? 'true' : undefined}
      className={cn(
        // Active state uses both a left accent border (2px primary) AND a
        // higher-contrast background so the cursor's location is obvious
        // even at a glance in dark mode. Inactive: muted, no border.
        'relative flex items-center justify-between rounded-md py-1.5 pr-2.5 text-left text-xs transition-colors',
        active
          ? 'bg-[var(--slice-highlight)] pl-3 font-medium text-foreground shadow-[inset_2px_0_0_var(--primary)]'
          : 'pl-3 text-muted-foreground hover:bg-[var(--slice-highlight)]/60 hover:text-foreground'
      )}
    >
      <span>{name}</span>
      {showCount && (
        <span className="font-mono text-[10px]">
          {picked > 0 && (
            <>
              <span className={cn(picked === total ? 'text-emerald-500' : 'text-foreground')}>
                {picked}
              </span>
              <span className="text-muted-foreground"> / </span>
            </>
          )}
          <span className={picked > 0 ? 'text-muted-foreground' : ''}>{total}</span>
        </span>
      )}
    </button>
  );
}

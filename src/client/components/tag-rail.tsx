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
        'flex w-[200px] flex-col border-r border-border bg-card/40',
        className
      )}
    >
      <p className="eyebrow px-3 pb-1.5 pt-3">Tags</p>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 pb-2">
        <RailItem
          name="All"
          picked={selectedCount}
          total={totalCount}
          active={activeTag === null}
          onClick={() => onSelectTag(null)}
        />
        <div className="my-1.5 h-px bg-border/60" aria-hidden />
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

      <footer className="flex flex-col gap-2 border-t border-border/60 bg-background/40 p-3">
        <p className="eyebrow">Context saved</p>
        <p className="h2 leading-none text-foreground">
          −{safePercent}
          <span className="font-mono ml-1 text-base text-muted-foreground">%</span>
        </p>
        <div className="h-1 w-full overflow-hidden rounded-full bg-border/60">
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${safePercent}%` }}
            aria-hidden
          />
        </div>
        <div className="font-mono mt-1 flex justify-between text-[10px] text-muted-foreground">
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
  picked: number;
  total: number;
  active: boolean;
  onClick: () => void;
}

function RailItem({ name, picked, total, active, onClick }: RailItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={name}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex items-center justify-between rounded px-2.5 py-1 text-left text-xs transition-colors',
        active
          ? 'bg-[var(--slice-highlight)] text-foreground'
          : 'text-muted-foreground hover:bg-[var(--slice-highlight)]/60 hover:text-foreground'
      )}
    >
      <span className="flex items-center gap-2">
        {active && <span className="h-1 w-1 rounded-full bg-foreground" aria-hidden />}
        <span>{name}</span>
      </span>
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
    </button>
  );
}

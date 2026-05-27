import { cn } from '@/lib/utils';

export interface BulkActionsProps {
  onCheckReads: () => void;
  onCheckWrites: () => void;
  onUncheckAll: () => void;
  className?: string;
}

const CHIP =
  'font-mono inline-flex h-7 items-center rounded-full border border-border bg-card/40 px-3 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:bg-[var(--slice-highlight)] hover:text-foreground';

export function BulkActions({
  onCheckReads,
  onCheckWrites,
  onUncheckAll,
  className,
}: BulkActionsProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <button type="button" onClick={onCheckReads} className={CHIP}>
        Check all reads
      </button>
      <button type="button" onClick={onCheckWrites} className={CHIP}>
        Check all writes
      </button>
      <button type="button" onClick={onUncheckAll} className={CHIP}>
        Uncheck all
      </button>
    </div>
  );
}

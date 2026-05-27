import type { Endpoint } from '@shared/types';
import { MethodBadge } from './method-badge';
import { cn } from '@/lib/utils';

export interface EndpointRowProps {
  endpoint: Endpoint;
  selected: boolean;
  focused: boolean;
  estimatedTokens: number;
  /** Clicking the row body (anywhere but the checkbox) requests focus. */
  onFocus: (id: string) => void;
  /** Clicking the checkbox toggles inclusion in the MCP. */
  onToggle: (id: string) => void;
  className?: string;
}

/**
 * Flat row used inside `<SelectionScreen>` (3-col layout, phase 04bis).
 *
 * Two clickable surfaces with distinct intents:
 *   - row body  → `onFocus(id)`  (drive the right preview pane)
 *   - checkbox  → `onToggle(id)` (include in the generated MCP)
 *
 * Stop-propagating the checkbox click prevents the row-body handler from
 * double-firing on the same gesture.
 */
export function EndpointRow({
  endpoint,
  selected,
  focused,
  estimatedTokens,
  onFocus,
  onToggle,
  className,
}: EndpointRowProps) {
  return (
    <div
      role="row"
      aria-current={focused ? 'true' : undefined}
      onClick={() => onFocus(endpoint.id)}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 rounded-md border border-transparent px-2 py-1.5 transition-colors',
        'hover:bg-[var(--slice-highlight)]/60',
        focused && 'border-border bg-[var(--slice-highlight)]',
        className
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(endpoint.id)}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Select ${endpoint.label}`}
        className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-primary"
      />
      <MethodBadge method={endpoint.method} />
      <span className="font-mono w-[220px] shrink-0 truncate text-[11px] text-muted-foreground" title={endpoint.path}>
        {endpoint.path}
      </span>
      <span className="flex-1 truncate text-sm text-foreground">{endpoint.label}</span>
      <span className="font-mono shrink-0 text-[10px] text-muted-foreground" aria-label={`~${estimatedTokens} tokens`}>
        ~{estimatedTokens} tk
      </span>
    </div>
  );
}

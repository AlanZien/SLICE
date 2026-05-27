import type { Endpoint } from '@shared/types';
import { MethodBadge } from './method-badge';
import { cn } from '@/lib/utils';

export interface EndpointRowProps {
  endpoint: Endpoint;
  selected: boolean;
  onToggle: (id: string) => void;
  className?: string;
}

export function EndpointRow({ endpoint, selected, onToggle, className }: EndpointRowProps) {
  const handle = () => onToggle(endpoint.id);

  return (
    <button
      type="button"
      role="button"
      aria-pressed={selected}
      aria-label={endpoint.label}
      onClick={handle}
      className={cn(
        'group flex w-full items-center gap-3 rounded-md border border-transparent px-2 py-1.5 text-left transition-colors',
        'hover:bg-[var(--slice-highlight)]',
        selected && 'bg-[var(--slice-highlight)]',
        className
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={handle}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Select ${endpoint.label}`}
        className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-primary"
      />
      <MethodBadge method={endpoint.method} />
      <span className="font-mono text-sm text-foreground">{endpoint.label}</span>
      <span className="font-mono ml-auto truncate text-xs text-muted-foreground" title={endpoint.path}>
        {endpoint.path}
      </span>
    </button>
  );
}

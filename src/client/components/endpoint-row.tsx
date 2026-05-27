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

  // The whole row is a <label> wrapping the checkbox + visual content. That
  // makes clicking anywhere on the row toggle the box via the native
  // input/label association — no JS click handler on the wrapper, no
  // bubbling weirdness, no duplicated aria semantics. Accessible by default.
  return (
    <label
      aria-label={endpoint.label}
      className={cn(
        'group flex w-full cursor-pointer items-center gap-3 rounded-md border border-transparent px-2 py-1.5 text-left transition-colors',
        'hover:bg-[var(--slice-highlight)]',
        selected && 'bg-[var(--slice-highlight)]',
        className
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={handle}
        aria-label={`Select ${endpoint.label}`}
        className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-primary"
      />
      <MethodBadge method={endpoint.method} />
      <span className="font-mono text-sm text-foreground">{endpoint.label}</span>
      <span className="font-mono ml-auto truncate text-xs text-muted-foreground" title={endpoint.path}>
        {endpoint.path}
      </span>
    </label>
  );
}

import { useState } from 'react';
import type { EndpointGroup as EndpointGroupModel } from '@shared/types';
import { EndpointRow } from './endpoint-row';
import { cn } from '@/lib/utils';

export interface EndpointGroupProps {
  group: EndpointGroupModel;
  isSelected: (id: string) => boolean;
  onToggle: (id: string) => void;
  className?: string;
}

export function EndpointGroup({ group, isSelected, onToggle, className }: EndpointGroupProps) {
  const [open, setOpen] = useState(true); // R1.2.4 — open by default
  const total = group.endpoints.length;
  const selectedCount = group.endpoints.filter((e) => isSelected(e.id)).length;

  return (
    <section className={cn('rounded-lg border border-border bg-card/30', className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-[var(--slice-highlight)]"
      >
        <span className="flex items-center gap-2">
          <span className={cn('font-mono text-xs text-muted-foreground transition-transform', open && 'rotate-90')}>›</span>
          <span className="font-mono text-sm font-medium text-foreground">{group.tag}</span>
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {selectedCount} / {total}
        </span>
      </button>

      {open && (
        <div className="border-t border-border/60 px-2 py-1.5">
          {group.endpoints.map((endpoint) => (
            <EndpointRow
              key={endpoint.id}
              endpoint={endpoint}
              selected={isSelected(endpoint.id)}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </section>
  );
}

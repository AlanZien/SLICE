import type { HttpMethod } from '@shared/types';
import { MethodBadge } from './method-badge';
import { cn } from '@/lib/utils';

export interface McpPackageCardTool {
  id: string;
  method: HttpMethod;
}

export interface McpPackageCardProps {
  name: string;
  endpointCount: number;
  savedPercent: number;
  transportLabel: string;
  authLabel: string;
  sampleTools: ReadonlyArray<McpPackageCardTool>;
  /** How many additional tools fit in the package beyond the sample shown. */
  extraToolsCount: number;
  className?: string;
}

export function McpPackageCard({
  name,
  endpointCount,
  savedPercent,
  transportLabel,
  authLabel,
  sampleTools,
  extraToolsCount,
  className,
}: McpPackageCardProps) {
  const displayName = name && name.trim().length > 0 ? name : 'untitled-mcp';
  const savingsClass =
    savedPercent >= 50 ? 'text-emerald-500' : savedPercent >= 25 ? 'text-amber-500' : 'text-muted-foreground';
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-4',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">@</span>
        <span className="text-base font-medium text-foreground">{displayName}</span>
        <span className="font-mono ml-auto rounded-full border border-border bg-card/40 px-2 py-0.5 text-[10px] text-muted-foreground">
          v0.1.0
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip label={`${endpointCount} endpoints`} />
        <Chip label={`−${savedPercent}% context`} className={savingsClass} />
        <Chip label={transportLabel} />
        <Chip label={authLabel} />
      </div>

      <div className="my-1 h-px bg-border/60" aria-hidden />

      <div className="flex flex-col gap-1.5">
        {sampleTools.map((tool) => (
          <div key={tool.id} className="flex items-center gap-2">
            <span className="font-mono flex-1 truncate text-[11px] text-muted-foreground">
              {tool.id}
            </span>
            <MethodBadge method={tool.method} />
          </div>
        ))}
        {extraToolsCount > 0 && (
          <span className="font-mono mt-1 text-[11px] text-muted-foreground">
            + {extraToolsCount} more…
          </span>
        )}
      </div>
    </div>
  );
}

function Chip({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        'font-mono rounded-full border border-border bg-card/40 px-2 py-0.5 text-[10px] text-muted-foreground',
        className
      )}
    >
      {label}
    </span>
  );
}

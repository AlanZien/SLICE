import type { DeploymentMode } from '@shared/types';
import { cn } from '@/lib/utils';

export interface ZipStructurePreviewProps {
  packageName: string;
  mode: DeploymentMode;
  className?: string;
}

/**
 * ASCII tree of the ZIP the generator will emit. The transport entries
 * (`index.js` for stdio, `http.js` for HTTP Streamable) light up with a
 * checkmark only when the chosen `mode` actually ships them.
 */
export function ZipStructurePreview({
  packageName,
  mode,
  className,
}: ZipStructurePreviewProps) {
  const name = packageName && packageName.trim().length > 0 ? packageName : 'untitled-mcp';
  const stdioMark = mode === 'local' || mode === 'both' ? '✓' : '—';
  const httpMark = mode === 'remote' || mode === 'both' ? '✓' : '—';

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <p className="eyebrow">ZIP structure</p>
      <pre
        role="region"
        aria-label="ZIP structure"
        className="font-mono overflow-x-auto rounded-md bg-background/40 p-3 text-[11px] leading-snug text-foreground"
      >
{`${name}/
├─ dist/
│  ├─ index.js          ${stdioMark}  stdio
│  └─ http.js           ${httpMark}  http
├─ .env.example
├─ package.json
└─ README.md`}
      </pre>
    </div>
  );
}

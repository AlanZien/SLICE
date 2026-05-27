import type { HttpMethod } from '@shared/types';
import { cn } from '@/lib/utils';

export interface MethodBadgeProps {
  method: HttpMethod;
  className?: string;
}

// Per-method color triplets — borrowed from common API tools (Insomnia,
// Postman) so the visual mapping feels familiar to API developers. Tailwind
// utility classes are spelled out (not interpolated) so the JIT compiler
// picks them up at build time.
const METHOD_CLASSES: Record<HttpMethod, string> = {
  GET: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30',
  POST: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-sky-500/30',
  PUT: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30',
  PATCH: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30',
  DELETE: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/30',
};

export function MethodBadge({ method, className }: MethodBadgeProps) {
  return (
    <span
      data-method={method}
      aria-label={`HTTP method: ${method}`}
      className={cn(
        'font-mono inline-flex h-5 min-w-[3.25rem] items-center justify-center rounded px-1.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset',
        METHOD_CLASSES[method],
        className
      )}
    >
      {method}
    </span>
  );
}

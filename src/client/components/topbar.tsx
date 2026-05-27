import { Moon, RotateCcw, Sun } from 'lucide-react';
import { Stepper } from './stepper';
import type { Theme } from '../hooks/use-theme';

export interface TopbarProps {
  current: 1 | 2 | 3 | 4;
  apiSlug: string | null;
  theme?: Theme;
  onReset: () => void;
  onToggleTheme: () => void;
}

function crumbFor(current: TopbarProps['current'], apiSlug: string | null): string {
  switch (current) {
    case 1:
      return '/new';
    case 2:
      return apiSlug ? `/${apiSlug}` : '/select';
    case 3:
      return '/configure';
    case 4:
      return '/done';
  }
}

export function Topbar({
  current,
  apiSlug,
  theme = 'dark',
  onReset,
  onToggleTheme,
}: TopbarProps) {
  return (
    <header className="relative z-10 flex h-12 items-center gap-4 border-b border-border bg-background px-5">
      <span className="wordmark">SLICE</span>

      <span
        aria-label="Breadcrumb"
        className="font-mono max-w-[320px] overflow-hidden truncate text-[11.5px] text-[var(--slice-ink-soft)]"
      >
        <span aria-hidden="true" className="mx-1 text-[var(--slice-ink-faint)]">
          /
        </span>
        {crumbFor(current, apiSlug).replace(/^\//, '')}
      </span>

      <Stepper current={current} />

      <div className="ml-auto flex items-center gap-3">
        <span
          className="font-mono inline-flex items-center gap-1 text-[11px] text-muted-foreground"
          aria-label="Raccourci recherche"
        >
          <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-border bg-secondary px-1 text-[10px]">
            ⌘
          </kbd>
          <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-border bg-secondary px-1 text-[10px]">
            K
          </kbd>
        </span>

        <button
          type="button"
          aria-label="Toggle theme"
          onClick={onToggleTheme}
          className="font-mono inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:bg-[var(--slice-highlight)] hover:text-foreground"
        >
          {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          <span className="sr-only">Toggle theme</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="font-mono inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:bg-[var(--slice-highlight)] hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>
    </header>
  );
}

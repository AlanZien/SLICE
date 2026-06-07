import { Moon, RotateCcw, Sun } from 'lucide-react';
import { Stepper } from './stepper';
import type { Theme } from '../hooks/use-theme';

export interface TopbarProps {
  current: 1 | 2 | 3 | 4;
  apiName: string | null;
  theme?: Theme;
  onReset: () => void;
  onToggleTheme: () => void;
  onNavigate?: (step: number) => void;
}

export function Topbar({
  current,
  apiName,
  theme = 'dark',
  onReset,
  onToggleTheme,
  onNavigate,
}: TopbarProps) {
  return (
    <header className="relative z-10 flex h-16 items-center gap-4 border-b border-border bg-background px-5">
      <span className="wordmark">SLICE</span>

      {apiName && (
        <span className="max-w-[280px] overflow-hidden truncate text-sm font-medium text-foreground/70">
          <span aria-hidden="true" className="mr-2 text-[var(--slice-ink-faint)]">/</span>
          {apiName}
        </span>
      )}

      <Stepper current={current} onNavigate={onNavigate} className="absolute left-1/2 -translate-x-1/2" />

      <div className="ml-auto flex items-center gap-3">
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

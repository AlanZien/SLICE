import { useState } from 'react';
import { Topbar } from './components/topbar';
import { useTheme } from './hooks/use-theme';

type ScreenIndex = 1 | 2 | 3 | 4;

function App() {
  const { theme, toggle } = useTheme();
  const [screen, setScreen] = useState<ScreenIndex>(1);
  const [apiSlug, setApiSlug] = useState<string | null>(null);

  const handleReset = () => {
    setScreen(1);
    setApiSlug(null);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar
        current={screen}
        apiSlug={apiSlug}
        theme={theme}
        onReset={handleReset}
        onToggleTheme={toggle}
      />

      <main className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-xl space-y-4 text-center">
          <h1 className="h1">Curated MCP servers for AI agents</h1>
          <p className="font-mono text-sm text-muted-foreground">
            Transforme ton API en serveur MCP en moins de 5 minutes.
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            Phase 01 — squelette en place. Les écrans arrivent.
          </p>

          {/* Dev-only shortcuts to preview stepper states. Stripped from prod. */}
          {import.meta.env.DEV && (
            <div className="font-mono flex justify-center gap-2 pt-6 text-[10px] text-muted-foreground">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setScreen(n as ScreenIndex);
                    if (n === 2) setApiSlug('shopify-admin-api');
                    if (n === 1) setApiSlug(null);
                  }}
                  className="rounded border border-border px-2 py-0.5 hover:bg-[var(--slice-highlight)]"
                >
                  Étape {n}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

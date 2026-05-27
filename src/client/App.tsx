import { useState } from 'react';
import type { ParsedSpec } from '@shared/types';
import { Topbar } from './components/topbar';
import { UploadScreen } from './screens/upload';
import { SelectionScreen } from './screens/selection';
import { useTheme } from './hooks/use-theme';

type ScreenIndex = 1 | 2 | 3 | 4;

function slugify(name: string): string {
  // CJK / emoji titles collapse to an empty string under [^\w\s-], so we
  // fall back to a stable placeholder instead of propagating "" to apiSlug
  // (which downstream would render as broken URLs / filenames).
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return slug.length > 0 ? slug : 'api';
}

function App() {
  const { theme, toggle } = useTheme();
  const [screen, setScreen] = useState<ScreenIndex>(1);
  const [apiSlug, setApiSlug] = useState<string | null>(null);
  const [parsedSpec, setParsedSpec] = useState<ParsedSpec | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleReset = () => {
    setScreen(1);
    setApiSlug(null);
    setParsedSpec(null);
    setSelectedIds([]);
  };

  const handleParsed = (spec: ParsedSpec) => {
    setParsedSpec(spec);
    setApiSlug(slugify(spec.apiName));
    setScreen(2);
  };

  const handleSelectionDone = (ids: string[]) => {
    setSelectedIds(ids);
    setScreen(3);
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

      <main className="flex flex-1 flex-col px-6">
        {screen === 1 && <UploadScreen onParsed={handleParsed} />}

        {screen === 2 && parsedSpec && (
          <SelectionScreen spec={parsedSpec} onContinue={handleSelectionDone} />
        )}

        {screen === 3 && parsedSpec && (
          <section className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center">
            <p className="eyebrow">Step 3 — Configure</p>
            <h2 className="h2">{parsedSpec.apiName}</h2>
            <p className="font-mono text-sm text-muted-foreground">
              {selectedIds.length} endpoints selected — configuration screen coming in phase 06.
            </p>
            {import.meta.env.DEV && (
              <details className="w-full text-left">
                <summary className="font-mono cursor-pointer text-xs text-muted-foreground">
                  Debug: selected ids (dev only)
                </summary>
                <pre className="font-mono mt-2 max-h-96 overflow-auto rounded bg-card/40 p-3 text-[10px]">
                  {JSON.stringify(selectedIds, null, 2)}
                </pre>
              </details>
            )}
          </section>
        )}

        {/* Dev-only shortcuts to preview stepper states. Stripped from prod. */}
        {import.meta.env.DEV && (
          <div className="font-mono fixed bottom-2 left-2 flex gap-1 text-[10px] text-muted-foreground opacity-50">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScreen(n as ScreenIndex)}
                className="rounded border border-border px-2 py-0.5 hover:bg-[var(--slice-highlight)]"
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

import { useState } from 'react';
import type { ParsedSpec, SliceConfig } from '@shared/types';
import { Topbar } from './components/topbar';
import { UploadScreen } from './screens/upload';
import { SelectionScreen } from './screens/selection';
import { ConfigScreen } from './screens/config';
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

  const handleGenerate = (config: SliceConfig) => {
    // Phase 07 will POST this to /api/generate. For now we just log it so
    // the boundary is real and the UX can be UAT-tested end-to-end.
    // eslint-disable-next-line no-console
    console.info('[SLICE] generate payload', { config, selectedIds });
    setScreen(4);
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
          <SelectionScreen
            spec={parsedSpec}
            onContinue={handleSelectionDone}
            onBack={handleReset}
          />
        )}

        {screen === 3 && parsedSpec && (
          <ConfigScreen
            spec={parsedSpec}
            selectedIds={selectedIds}
            onBack={() => setScreen(2)}
            onGenerate={handleGenerate}
          />
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

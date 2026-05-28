import { useState } from 'react';
import type { ParsedSpec, SliceConfig } from '@shared/types';
import { computeEconomy } from '@shared/token-estimator';
import { Topbar } from './components/topbar';
import { ToastProvider, useToast } from './components/toast';
import { UploadScreen } from './screens/upload';
import { SelectionScreen } from './screens/selection';
import { ConfigScreen } from './screens/config';
import { SuccessScreen } from './screens/success';
import { useTheme } from './hooks/use-theme';
import { ApiError, apiGenerate } from './lib/api';

type ScreenIndex = 1 | 2 | 3 | 4;

interface SuccessState {
  config: SliceConfig;
  zipBlob: Blob;
  endpointCount: number;
  economySnapshot: number;
}

function AppInner() {
  const { theme, toggle } = useTheme();
  const [screen, setScreen] = useState<ScreenIndex>(1);
  const [apiSlug, setApiSlug] = useState<string | null>(null);
  const [parsedSpec, setParsedSpec] = useState<ParsedSpec | null>(null);
  const [rawSpec, setRawSpec] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [generating, setGenerating] = useState(false);
  const { push } = useToast();

  const handleReset = () => {
    setScreen(1);
    setApiSlug(null);
    setParsedSpec(null);
    setRawSpec('');
    setSelectedIds([]);
    setSuccess(null);
  };

  const handleParsed = (spec: ParsedSpec, raw: string) => {
    setParsedSpec(spec);
    setRawSpec(raw);
    setApiSlug(spec.defaultConfig?.mcpName ?? null);
    setScreen(2);
  };

  const handleSelectionDone = (ids: string[]) => {
    setSelectedIds(ids);
    setScreen(3);
  };

  const handleGenerate = async (config: SliceConfig) => {
    if (!parsedSpec) return;
    if (generating) return;
    setGenerating(true);
    // R1.5.6 — snapshot the economy BEFORE network round-trips so the success
    // screen shows the value at the click moment, not whatever the user
    // tweaked while waiting.
    const economy = computeEconomy(parsedSpec, selectedIds);
    try {
      const { blob } = await apiGenerate({
        parsedSpec,
        rawSpec,
        selectedIds,
        config,
      });
      setSuccess({
        config,
        zipBlob: blob,
        endpointCount: selectedIds.length,
        economySnapshot: economy.percent,
      });
      setScreen(4);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Could not reach the server. Try again in a moment.';
      push({ variant: 'error', message });
    } finally {
      setGenerating(false);
    }
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

        {screen === 4 && success && (
          <SuccessScreen
            config={success.config}
            endpointCount={success.endpointCount}
            economySnapshot={success.economySnapshot}
            zipBlob={success.zipBlob}
            onRestart={handleReset}
            onBackToSelection={() => setScreen(2)}
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

function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}

export default App;

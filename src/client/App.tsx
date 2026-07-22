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
import { ApiError, apiGenerate, apiHost } from './lib/api';

type ScreenIndex = 1 | 2 | 3 | 4;

interface SuccessState {
  config: SliceConfig;
  /** Self-host flow — the generated bundle. Absent in the hosted flow. */
  zipBlob?: Blob;
  /** Hosted (SLICE Cloud) flow — the live MCP URL. Absent in the bundle flow. */
  hostedUrl?: string;
  /** Hosted flow — free-tier expiry (ISO), `null` when the instance has no TTL. */
  expiresAt?: string | null;
  endpointCount: number;
  economySnapshot: number;
}

function AppInner() {
  const { theme, toggle } = useTheme();
  const [screen, setScreen] = useState<ScreenIndex>(1);
  const [apiName, setApiName] = useState<string | null>(null);
  const [parsedSpec, setParsedSpec] = useState<ParsedSpec | null>(null);
  const [rawSpec, setRawSpec] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [generating, setGenerating] = useState(false);
  const { push } = useToast();

  const handleReset = () => {
    setScreen(1);
    setApiName(null);
    setParsedSpec(null);
    setRawSpec('');
    setSelectedIds([]);
    setSuccess(null);
  };

  const handleNavigate = (step: number) => {
    if (step === 1) { handleReset(); return; }
    if (step === 2 && parsedSpec) { setScreen(2); return; }
    if (step === 3 && parsedSpec && selectedIds.length > 0) { setScreen(3); }
  };

  const handleParsed = (spec: ParsedSpec, raw: string) => {
    setParsedSpec(spec);
    setRawSpec(raw);
    setApiName(spec.apiName ?? null);
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
    const request = { parsedSpec, rawSpec, selectedIds, config };
    try {
      if (config.hosting === 'cloud') {
        // SLICE Cloud — the server stores the config and returns a live URL.
        // No bundle is downloaded; the success screen shows the URL + snippet.
        const { url, expiresAt } = await apiHost(request);
        setSuccess({
          config,
          hostedUrl: url,
          expiresAt,
          endpointCount: selectedIds.length,
          economySnapshot: economy.percent,
        });
      } else {
        // Self-host — download the ready-to-run bundle.
        const { blob } = await apiGenerate(request);
        setSuccess({
          config,
          zipBlob: blob,
          endpointCount: selectedIds.length,
          economySnapshot: economy.percent,
        });
      }
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
    <div className="flex h-screen flex-col overflow-hidden">
      <Topbar
        current={screen}
        apiName={apiName}
        theme={theme}
        onReset={handleReset}
        onToggleTheme={toggle}
        onNavigate={handleNavigate}
      />

      <main className="flex flex-1 flex-col overflow-hidden px-6">
        {screen === 1 && <UploadScreen onParsed={handleParsed} />}

        {screen === 2 && parsedSpec && (
          <SelectionScreen
            spec={parsedSpec}
            onContinue={handleSelectionDone}
          />
        )}

        {screen === 3 && parsedSpec && (
          <ConfigScreen
            spec={parsedSpec}
            selectedIds={selectedIds}
            onGenerate={handleGenerate}
          />
        )}

        {screen === 4 && success && (
          <SuccessScreen
            config={success.config}
            endpointCount={success.endpointCount}
            economySnapshot={success.economySnapshot}
            zipBlob={success.zipBlob}
            hostedUrl={success.hostedUrl}
            expiresAt={success.expiresAt}
            onRestart={handleReset}
            onBackToSelection={() => setScreen(2)}
          />
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

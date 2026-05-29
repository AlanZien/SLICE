import { useState } from 'react';
import type { BinaryTarget, GenerateRequest, ParsedSpec, SliceConfig } from '@shared/types';
import { computeEconomy } from '@shared/token-estimator';
import { Topbar } from './components/topbar';
import { ToastProvider, useToast } from './components/toast';
import { UploadScreen } from './screens/upload';
import { SelectionScreen } from './screens/selection';
import { ConfigScreen } from './screens/config';
import { SuccessScreen, type PrimaryBinary } from './screens/success';
import { useTheme } from './hooks/use-theme';
import { ApiError, apiGenerateBinary } from './lib/api';
import { detectOs } from './lib/os-detection';

type ScreenIndex = 1 | 2 | 3 | 4;

interface SuccessState {
  config: SliceConfig;
  primaryBinary: PrimaryBinary;
  endpointCount: number;
  economySnapshot: number;
  /** Stashed so the "other OS" button can re-call apiGenerateBinary. */
  request: GenerateRequest;
}

/** Default primary target by detected OS. Mac defaults to Apple Silicon. */
function primaryTargetForOs(): BinaryTarget {
  const os = detectOs();
  if (os === 'windows') return 'windows-x64';
  // 'mac' or 'unknown' → most common modern target
  return 'macos-arm64';
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
    const target = primaryTargetForOs();
    const request: GenerateRequest = { parsedSpec, rawSpec, selectedIds, config };
    try {
      const { blob, filename } = await apiGenerateBinary(request, target);
      setSuccess({
        config,
        primaryBinary: { blob, filename, target },
        endpointCount: selectedIds.length,
        economySnapshot: economy.percent,
        request,
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

  const handleFetchOtherBinary = async (target: BinaryTarget) => {
    if (!success) throw new Error('No active success state');
    return apiGenerateBinary(success.request, target);
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
            primaryBinary={success.primaryBinary}
            fetchOtherBinary={handleFetchOtherBinary}
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

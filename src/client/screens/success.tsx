/**
 * Screen 4 — success. Shown right after the first /api/generate-binary call
 * returns. The user already has the binary for their detected OS — it was
 * auto-downloaded as the upload-style request resolved (see useDownload).
 *
 * Layout (top to bottom):
 *   - Animated checkmark
 *   - Headline "Your MCP is ready"
 *   - Recap line: <mcpName> · <N> endpoints · <X>% context saved
 *   - Primary download button (the OS we detected — re-trigger if needed)
 *   - Secondary download button (the OTHER OS — compiles on demand)
 *   - Note: "Double-click the file to launch it"
 *   - ConnectionTabs (Claude Desktop / n8n / Airia)
 *   - CTAs: regenerate, back to selection
 *
 * The economy percentage is a SNAPSHOT (R1.5.6) taken at click-Generate.
 */
import { useCallback, useState } from 'react';
import type { BinaryTarget, SliceConfig } from '@shared/types';
import { CheckAnim } from '../components/check-anim';
import { ConnectionTabs } from '../components/connection-tabs';
import { useDownload } from '../hooks/use-download';
import { useToast } from '../components/toast';

/** UI-facing OS label. */
type Os = 'mac' | 'windows';

/** Map a BinaryTarget to its display OS bucket. */
function targetOs(t: BinaryTarget): Os {
  return t === 'windows-x64' ? 'windows' : 'mac';
}

/** Pick the canonical "other OS" target. Mac variants both fall through to
 *  windows; on Windows we offer the Apple Silicon Mac binary (the dominant
 *  Mac SKU since 2023). Intel Mac users can be served later via a tertiary
 *  control if there's signal. */
function otherTarget(primary: BinaryTarget): BinaryTarget {
  return targetOs(primary) === 'mac' ? 'windows-x64' : 'macos-arm64';
}

export interface PrimaryBinary {
  blob: Blob;
  filename: string;
  target: BinaryTarget;
}

export interface SuccessScreenProps {
  config: SliceConfig;
  endpointCount: number;
  /** % of context saved compared to shipping the full spec. */
  economySnapshot: number;
  /** Already-fetched binary for the user's detected OS. */
  primaryBinary: PrimaryBinary;
  /** Fetches a binary for the other OS on demand. App owns the network call. */
  fetchOtherBinary: (target: BinaryTarget) => Promise<{ blob: Blob; filename: string }>;
  onRestart: () => void;
  onBackToSelection: () => void;
}

export function SuccessScreen({
  config,
  endpointCount,
  economySnapshot,
  primaryBinary,
  fetchOtherBinary,
  onRestart,
  onBackToSelection,
}: SuccessScreenProps) {
  const { redownload } = useDownload(primaryBinary.blob, primaryBinary.filename);
  const { push } = useToast();

  const primaryOs = targetOs(primaryBinary.target);
  const other = otherTarget(primaryBinary.target);
  const otherOs = targetOs(other);

  const [secondaryBlob, setSecondaryBlob] = useState<Blob | null>(null);
  const [secondaryFilename, setSecondaryFilename] = useState<string>('');
  const [loadingOther, setLoadingOther] = useState(false);

  // Drive the second download exactly like the first: once the blob is set,
  // useDownload fires automatically. The WeakSet inside useDownload makes
  // sure each blob downloads at most once even with StrictMode double-mount.
  useDownload(secondaryBlob, secondaryFilename);

  const handleOther = useCallback(async () => {
    if (loadingOther) return;
    setLoadingOther(true);
    try {
      const { blob, filename } = await fetchOtherBinary(other);
      setSecondaryFilename(filename);
      setSecondaryBlob(blob);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Could not build the other binary. Try again in a moment.';
      push({ variant: 'error', message });
    } finally {
      setLoadingOther(false);
    }
  }, [fetchOtherBinary, other, loadingOther, push]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex flex-col items-center gap-6 text-center">
        <CheckAnim />
        <h1 className="font-serif text-4xl italic">Your MCP is ready</h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono">{config.mcpName}</span>
          {' · '}
          <span>{endpointCount} endpoints exposed</span>
          {' · '}
          <span>{economySnapshot}% context saved</span>
        </p>

        <div className="flex flex-col items-center gap-2 sm:flex-row">
          <button
            type="button"
            onClick={redownload}
            className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90"
          >
            Download for {osLabel(primaryOs)}
          </button>
          <button
            type="button"
            onClick={handleOther}
            disabled={loadingOther}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {loadingOther
              ? `Building for ${osLabel(otherOs)}…`
              : `Download for ${osLabel(otherOs)}`}
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Double-click the file to launch your MCP. No install, no terminal.
        </p>
      </div>

      <section className="mt-12">
        <ConnectionTabs config={config} />
      </section>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Generate another MCP
        </button>
        <button
          type="button"
          onClick={onBackToSelection}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Back to selection
        </button>
      </div>
    </div>
  );
}

function osLabel(os: Os): string {
  return os === 'mac' ? 'Mac' : 'Windows';
}

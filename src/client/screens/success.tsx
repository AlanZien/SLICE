/**
 * Screen 4 — success. Shown right after `/api/generate` returns a ZIP blob.
 *
 * Layout (top to bottom):
 *   - Animated checkmark
 *   - Headline "Your MCP is ready" (Fraunces italic)
 *   - Recap line: <mcpName> · <N> endpoints · <X>% context saved
 *   - 3 numbered steps to use the bundle (Fraunces italic for numbers)
 *   - ConnectionTabs (Claude Desktop / n8n / Airia)
 *   - CTAs: regenerate, back to selection
 *
 * The economy percentage is a SNAPSHOT (R1.5.6) — taken at click-Generate and
 * passed in as a prop, NOT recomputed here. That keeps the screen stable
 * even if the user goes back and tweaks the selection later.
 */
import type { SliceConfig } from '@shared/types';
import { CheckAnim } from '../components/check-anim';
import { ConnectionTabs } from '../components/connection-tabs';
import { useDownload } from '../hooks/use-download';

export interface SuccessScreenProps {
  config: SliceConfig;
  endpointCount: number;
  /** % of context saved compared to shipping the full spec. */
  economySnapshot: number;
  zipBlob: Blob;
  onRestart: () => void;
  onBackToSelection: () => void;
}

export function SuccessScreen({
  config,
  endpointCount,
  economySnapshot,
  zipBlob,
  onRestart,
  onBackToSelection,
}: SuccessScreenProps) {
  const { redownload } = useDownload(zipBlob, `${config.mcpName}.zip`);

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
        <button
          type="button"
          onClick={redownload}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Download again
        </button>
      </div>

      <ol className="mt-10 space-y-4">
        <Step n={1}>
          Unzip and{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">cd {config.mcpName}</code>
        </Step>
        <Step n={2}>
          Run{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">pnpm install &amp;&amp; pnpm build</code>
        </Step>
        <Step n={3}>
          Copy the snippet below into the agent of your choice and you&apos;re live.
        </Step>
      </ol>

      <section className="mt-10">
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

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-baseline gap-3">
      <span className="font-serif text-xl italic text-muted-foreground">{n}.</span>
      <span className="text-sm">{children}</span>
    </li>
  );
}

/**
 * Screen 4 — success. Two flavours, picked by `hostedUrl`:
 *
 * - **SLICE Cloud (hosted)** — `hostedUrl` is set. The MCP already runs on our
 *   infra; we show the live URL, a copyable snippet per agent (token relayed,
 *   RC5.3), and skip the unzip/install steps entirely. No ZIP is produced.
 * - **Self-host bundle** — `zipBlob` is set. The classic flow: download the
 *   kit, unzip, install, paste a snippet.
 *
 * The economy percentage is a SNAPSHOT (R1.5.6) — taken at click-Generate and
 * passed in as a prop, NOT recomputed here. That keeps the screen stable
 * even if the user goes back and tweaks the selection later.
 */
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { SliceConfig } from '@shared/types';
import { ConnectionTabs } from '../components/connection-tabs';
import { useDownload } from '../hooks/use-download';

export interface SuccessScreenProps {
  config: SliceConfig;
  endpointCount: number;
  /** % of context saved compared to shipping the full spec. */
  economySnapshot: number;
  /** Bundle flow — the generated ZIP. Absent in the hosted flow. */
  zipBlob?: Blob;
  /** Hosted flow — the live MCP URL. Absent in the bundle flow. */
  hostedUrl?: string;
  /** Hosted flow — free-tier expiry (ISO). `null`/absent = no expiry (TTL disabled). */
  expiresAt?: string | null;
  onRestart: () => void;
  onBackToSelection: () => void;
}

const PERMANENT_PLAN_MAILTO =
  'mailto:maisonepigenetic@gmail.com?subject=SLICE%20%E2%80%94%20permanent%20hosting';

export function SuccessScreen({
  config,
  endpointCount,
  economySnapshot,
  zipBlob,
  hostedUrl,
  expiresAt,
  onRestart,
  onBackToSelection,
}: SuccessScreenProps) {
  const hosted = typeof hostedUrl === 'string' && hostedUrl.length > 0;
  // No-op when zipBlob is undefined (hosted flow) — the hook guards on null.
  const { redownload } = useDownload(zipBlob ?? null, `${config.mcpName}.zip`);

  return (
    <div className="mx-auto w-full max-w-3xl overflow-y-auto px-6 py-12">
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="font-serif text-4xl italic">
          {hosted ? 'Your MCP is live' : 'Your MCP is ready'}
        </h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono">{config.mcpName}</span>
          {' · '}
          <span>{endpointCount} endpoints exposed</span>
          {' · '}
          <span>{economySnapshot}% context saved</span>
        </p>
        {!hosted && (
          <button
            type="button"
            onClick={redownload}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Download again
          </button>
        )}
      </div>

      {hosted ? (
        <section className="mt-10 flex flex-col gap-3">
          <p className="eyebrow">Your live endpoint</p>
          <UrlRow url={hostedUrl} />
          {expiresAt && (
            <p className="text-sm text-muted-foreground">
              This URL stays live until{' '}
              <span className="text-foreground">
                {new Date(expiresAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>{' '}
              — plenty to wire it into your agent and test it. Need it permanent?{' '}
              <a href={PERMANENT_PLAN_MAILTO} className="underline text-foreground hover:opacity-80">
                Get a permanent plan
              </a>
            </p>
          )}
        </section>
      ) : (
        <ol className="mt-10 space-y-4">
          <Step n={1}>
            Unzip and{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">cd {config.mcpName}</code>
          </Step>
          <Step n={2}>
            Run{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              pnpm install &amp;&amp; pnpm build
            </code>
          </Step>
          <Step n={3}>
            Copy the snippet below into the agent of your choice and you&apos;re live.
          </Step>
        </ol>
      )}

      <section className="mt-10 flex flex-col gap-3">
        {hosted &&
          (config.upstreamAuth.type === 'none' ? (
            <p className="text-sm text-muted-foreground">
              This API is public — paste the snippet below into your agent and you&apos;re live.
              No token needed.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Paste the snippet below into your agent, then replace{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">PASTE_YOUR_TOKEN_HERE</code>{' '}
              with the token of your target API. We relay it on every call — it&apos;s never stored.
            </p>
          ))}
        <ConnectionTabs config={config} hostedUrl={hostedUrl} />
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

function UrlRow({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
      <span className="font-mono min-w-0 flex-1 truncate text-sm text-foreground">{url}</span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy"
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
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

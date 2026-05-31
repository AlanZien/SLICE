/**
 * Tabbed switcher between the three connection snippets shown on the
 * success screen. The set of *enabled* tabs depends on `config.mode`:
 *
 * - `local`  → only Claude Desktop (stdio)
 * - `remote` → only n8n + Airia (HTTP)
 * - `both`   → all three; default tab is Claude Desktop
 *
 * Keyboard support: ArrowLeft/Right cycle through enabled tabs.
 */
import { useMemo, useState, type KeyboardEvent } from 'react';
import type { SliceConfig } from '@shared/types';
import { CodeSnippet } from './code-snippet';
import {
  buildAiriaSnippet,
  buildClaudeDesktopSnippet,
  buildN8nSnippet,
  buildHostedAiriaSnippet,
  buildHostedClaudeSnippet,
  buildHostedN8nSnippet,
} from '../lib/snippets';

type TabId = 'claude' | 'n8n' | 'airia';

interface TabDef {
  id: TabId;
  label: string;
  /** Snippet for the local/bundle flow (stdio + HTTP placeholder host). */
  build: (config: SliceConfig) => { code: string; label: string };
  /** Snippet for the hosted flow — same MCP served at a real `url` (RC5.3). */
  buildHosted: (url: string, config: SliceConfig) => { code: string; label: string };
}

const TABS: ReadonlyArray<TabDef> = [
  {
    id: 'claude',
    label: 'Claude Desktop',
    build: (c) => ({ code: buildClaudeDesktopSnippet(c), label: 'JSON' }),
    buildHosted: (u, c) => ({ code: buildHostedClaudeSnippet(u, c), label: 'JSON' }),
  },
  {
    id: 'n8n',
    label: 'n8n',
    build: (c) => ({ code: buildN8nSnippet(c), label: 'config' }),
    buildHosted: (u, c) => ({ code: buildHostedN8nSnippet(u, c), label: 'config' }),
  },
  {
    id: 'airia',
    label: 'Airia',
    build: (c) => ({ code: buildAiriaSnippet(c), label: 'config' }),
    buildHosted: (u, c) => ({ code: buildHostedAiriaSnippet(u, c), label: 'config' }),
  },
];

/**
 * Tab availability. In hosted mode (a real `url`) all three agents reach the
 * MCP over HTTP, so every tab is active and the stdio/HTTP gating is abrogated
 * (RC5.3). Otherwise it follows the transport `mode`.
 */
function isEnabled(tab: TabId, mode: SliceConfig['mode'], hosted: boolean): boolean {
  if (hosted) return true;
  if (tab === 'claude') return mode !== 'remote';
  return mode !== 'local';
}

function defaultTab(mode: SliceConfig['mode'], hosted: boolean): TabId {
  if (hosted) return 'claude';
  if (mode === 'remote') return 'n8n';
  return 'claude';
}

export function ConnectionTabs({
  config,
  hostedUrl,
}: {
  config: SliceConfig;
  /** When set, snippets target this hosted URL and every tab is enabled. */
  hostedUrl?: string;
}) {
  const hosted = typeof hostedUrl === 'string' && hostedUrl.length > 0;
  const [active, setActive] = useState<TabId>(() => defaultTab(config.mode, hosted));
  const enabled = useMemo(
    () => TABS.filter((t) => isEnabled(t.id, config.mode, hosted)).map((t) => t.id),
    [config.mode, hosted]
  );

  function moveBy(delta: number) {
    if (enabled.length === 0) return;
    const idx = enabled.indexOf(active);
    const start = idx === -1 ? 0 : idx;
    const next = enabled[(start + delta + enabled.length) % enabled.length];
    if (next) setActive(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveBy(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveBy(-1);
    }
  }

  const activeDef = TABS.find((t) => t.id === active) ?? TABS[0]!;
  const built = hosted ? activeDef.buildHosted(hostedUrl, config) : activeDef.build(config);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Connection snippets"
        onKeyDown={onKeyDown}
        className="mb-3 flex gap-1 border-b border-border"
      >
        {TABS.map((tab) => {
          const enabledTab = isEnabled(tab.id, config.mode, hosted);
          const selected = enabledTab && active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-disabled={!enabledTab}
              tabIndex={selected ? 0 : -1}
              disabled={!enabledTab}
              onClick={() => enabledTab && setActive(tab.id)}
              className={
                'border-b-2 px-3 py-2 text-sm font-medium transition-colors ' +
                (selected
                  ? 'border-foreground text-foreground'
                  : enabledTab
                    ? 'border-transparent text-muted-foreground hover:text-foreground'
                    : 'cursor-not-allowed border-transparent text-muted-foreground/40')
              }
              title={
                enabledTab
                  ? undefined
                  : tab.id === 'claude'
                    ? 'Available with the local (stdio) transport'
                    : 'Available with the HTTP transport'
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <CodeSnippet code={built.code} label={built.label} />
    </div>
  );
}

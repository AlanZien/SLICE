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
import { buildAiriaSnippet, buildClaudeDesktopSnippet, buildN8nSnippet } from '../lib/snippets';

type TabId = 'claude' | 'n8n' | 'airia';

interface TabDef {
  id: TabId;
  label: string;
  /** snippet content + label fed into <CodeSnippet>. */
  build: (config: SliceConfig) => { code: string; label: string };
}

const TABS: ReadonlyArray<TabDef> = [
  {
    id: 'claude',
    label: 'Claude Desktop',
    build: (c) => ({ code: buildClaudeDesktopSnippet(c), label: 'JSON' }),
  },
  {
    id: 'n8n',
    label: 'n8n',
    build: (c) => ({ code: buildN8nSnippet(c), label: 'config' }),
  },
  {
    id: 'airia',
    label: 'Airia',
    build: (c) => ({ code: buildAiriaSnippet(c), label: 'config' }),
  },
];

function isEnabled(tab: TabId, mode: SliceConfig['mode']): boolean {
  if (tab === 'claude') return mode !== 'remote';
  return mode !== 'local';
}

function defaultTab(mode: SliceConfig['mode']): TabId {
  if (mode === 'remote') return 'n8n';
  return 'claude';
}

export function ConnectionTabs({ config }: { config: SliceConfig }) {
  const [active, setActive] = useState<TabId>(() => defaultTab(config.mode));
  const enabled = useMemo(
    () => TABS.filter((t) => isEnabled(t.id, config.mode)).map((t) => t.id),
    [config.mode]
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
  const built = activeDef.build(config);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Connection snippets"
        onKeyDown={onKeyDown}
        className="mb-3 flex gap-1 border-b border-border"
      >
        {TABS.map((tab) => {
          const enabledTab = isEnabled(tab.id, config.mode);
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

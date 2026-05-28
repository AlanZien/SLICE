import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Endpoint, ParsedSpec } from '@shared/types';
import {
  computeEconomy,
  estimateEndpointTokens,
  estimateSpecTokens,
} from '@shared/token-estimator';
import { ApiHeader } from '@/components/api-header';
import { EndpointPreview } from '@/components/endpoint-preview';
import { EndpointRow } from '@/components/endpoint-row';
import { FilterChips, type FilterMode } from '@/components/filter-chips';
import { SearchBox } from '@/components/search-box';
import { StickyFooter } from '@/components/sticky-footer';
import { TagRail } from '@/components/tag-rail';
import { useSelection } from '@/hooks/use-selection';

export interface SelectionScreenProps {
  spec: ParsedSpec;
  onContinue: (selectedIds: string[]) => void;
  onBack: () => void;
}

function matchesQuery(endpoint: Endpoint, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    endpoint.label.toLowerCase().includes(q) ||
    endpoint.path.toLowerCase().includes(q)
  );
}

function passesFilter(endpoint: Endpoint, mode: FilterMode): boolean {
  if (mode === 'all') return true;
  if (mode === 'read') return endpoint.method === 'GET';
  return endpoint.method !== 'GET';
}

export function SelectionScreen({ spec, onContinue, onBack }: SelectionScreenProps) {
  const selection = useSelection(spec);
  const [activeTag, setActiveTag] = useState<string | null>(
    spec.groups[0]?.tag ?? null
  );
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  // TODO (phase 06): bubble baseUrl edits up to App.tsx.
  const [baseUrl, setBaseUrl] = useState(spec.baseUrl);
  // 12.c — deprecated hidden by default; reuse the same toggle here.
  const [showDeprecated, setShowDeprecated] = useState(false);

  const allEndpoints = useMemo(
    () => spec.groups.flatMap((g) => g.endpoints),
    [spec]
  );

  // Memoise per-endpoint token estimates — used by both the rows and the
  // preview pane. A single pass keeps the right pane consistent with the
  // numbers in the list.
  const tokensById = useMemo(() => {
    const map = new Map<string, number>();
    for (const ep of allEndpoints) {
      map.set(ep.id, estimateEndpointTokens(ep));
    }
    return map;
  }, [allEndpoints]);

  const fullTokens = useMemo(() => estimateSpecTokens(spec), [spec]);
  const economy = useMemo(
    () => computeEconomy(spec, Array.from(selection.selected)),
    [spec, selection.selected]
  );

  // List shown in the centre pane: filtered by active tag (or "All"),
  // search query, read/write mode, and the deprecated toggle.
  const visibleEndpoints = useMemo(() => {
    const source = activeTag === null
      ? allEndpoints
      : (spec.groups.find((g) => g.tag === activeTag)?.endpoints ?? []);
    return source.filter((ep) => {
      if (!showDeprecated && ep.deprecated) return false;
      if (!passesFilter(ep, filterMode)) return false;
      return matchesQuery(ep, query);
    });
  }, [spec, activeTag, allEndpoints, filterMode, query, showDeprecated]);

  // Auto-focus the first visible row when the list changes — keeps the
  // preview pane meaningful even when the user clicks a new tag.
  useEffect(() => {
    if (visibleEndpoints.length === 0) {
      selection.setFocused(null);
      return;
    }
    const stillVisible = selection.focused
      ? visibleEndpoints.some((e) => e.id === selection.focused)
      : false;
    if (!stillVisible) {
      selection.setFocused(visibleEndpoints[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleEndpoints]);

  const focusedEndpoint = useMemo(
    () => allEndpoints.find((e) => e.id === selection.focused) ?? null,
    [allEndpoints, selection.focused]
  );

  const totalCount = useMemo(
    () =>
      allEndpoints.filter((e) => showDeprecated || !e.deprecated).length,
    [allEndpoints, showDeprecated]
  );

  const tagRailItems = useMemo(
    () =>
      spec.groups.map((g) => {
        const counts = selection.tagCounts.get(g.tag) ?? { picked: 0, total: g.endpoints.length };
        return { name: g.tag, picked: counts.picked, total: counts.total };
      }),
    [spec, selection.tagCounts]
  );

  const isVisible = useCallback(
    (e: Endpoint) => {
      if (!showDeprecated && e.deprecated) return false;
      if (activeTag !== null && !spec.groups.find((g) => g.tag === activeTag)?.endpoints.includes(e)) {
        return false;
      }
      if (!passesFilter(e, filterMode)) return false;
      return matchesQuery(e, query);
    },
    [activeTag, filterMode, query, showDeprecated, spec]
  );

  const bulkCheckReads = () => selection.bulkCheck((e) => e.method === 'GET', isVisible);
  const bulkCheckWrites = () => selection.bulkCheck((e) => e.method !== 'GET', isVisible);

  return (
    <div className="flex h-full min-h-[calc(100vh-3.5rem)] flex-col">
      {/* API banner */}
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
        <ApiHeader
          apiName={spec.apiName}
          apiVersion={spec.apiVersion}
          baseUrl={baseUrl}
          onBaseUrlChange={setBaseUrl}
        />
        <div className="flex items-center gap-2">
          {spec.excludedCount && spec.excludedCount > 0 ? (
            <span className="font-mono rounded-full border border-border bg-card/40 px-3 py-1 text-[10px] text-muted-foreground">
              {spec.excludedCount} excluded · missing description
            </span>
          ) : null}
        </div>
      </div>

      {/* 3-pane split */}
      <div className="flex min-h-0 flex-1">
        <TagRail
          tags={tagRailItems}
          activeTag={activeTag}
          onSelectTag={setActiveTag}
          savedPercent={economy.percent}
          selectedCount={selection.count}
          totalCount={totalCount}
          sliceTokens={economy.selected}
          fullTokens={fullTokens}
        />

        {/* Centre — list */}
        <section className="flex min-w-0 flex-1 flex-col">
          {/* Action bar */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <SearchBox
              value={query}
              onChange={setQuery}
              placeholder={
                activeTag === null
                  ? 'Search every endpoint…'
                  : `Search in ${activeTag}…`
              }
              className="max-w-sm flex-1"
            />
            <FilterChips value={filterMode} onChange={setFilterMode} />
            <span className="grow" />
            <button
              type="button"
              onClick={bulkCheckReads}
              className="font-mono inline-flex h-7 items-center rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:bg-[var(--slice-highlight)] hover:text-foreground"
            >
              ↓ reads
            </button>
            <button
              type="button"
              onClick={bulkCheckWrites}
              className="font-mono inline-flex h-7 items-center rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:bg-[var(--slice-highlight)] hover:text-foreground"
            >
              ↑ writes
            </button>
            <button
              type="button"
              onClick={selection.bulkUncheck}
              className="font-mono inline-flex h-7 items-center rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:bg-[var(--slice-highlight)] hover:text-foreground"
            >
              ∅ all
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-2">
            {visibleEndpoints.length === 0 ? (
              <p className="font-mono p-6 text-center text-xs text-muted-foreground">
                No endpoints match this search.
              </p>
            ) : (
              visibleEndpoints.map((ep) => (
                <EndpointRow
                  key={ep.id}
                  endpoint={ep}
                  selected={selection.isSelected(ep.id)}
                  focused={selection.focused === ep.id}
                  estimatedTokens={tokensById.get(ep.id) ?? 0}
                  onFocus={selection.setFocused}
                  onToggle={selection.toggle}
                />
              ))
            )}
          </div>

          {/* Deprecated toggle — anchored to the bottom of the list pane */}
          {(() => {
            const deprecatedCount = allEndpoints.filter((e) => e.deprecated).length;
            if (deprecatedCount === 0) return null;
            return (
              <label className="font-mono flex cursor-pointer items-center gap-2 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={showDeprecated}
                  onChange={() => setShowDeprecated((s) => !s)}
                  className="h-3 w-3 accent-primary"
                />
                Show deprecated ({deprecatedCount})
              </label>
            );
          })()}
        </section>

        <EndpointPreview
          endpoint={focusedEndpoint}
          selected={focusedEndpoint ? selection.isSelected(focusedEndpoint.id) : false}
          estimatedTokens={focusedEndpoint ? tokensById.get(focusedEndpoint.id) ?? 0 : 0}
          onToggle={selection.toggle}
        />
      </div>

      <StickyFooter
        selectedCount={selection.count}
        onBack={onBack}
        onContinue={() => onContinue(selection.selectedIds())}
      />
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import type { Endpoint, ParsedSpec } from '@shared/types';
import {
  computeEconomy,
  estimateEndpointTokens,
  estimateSpecTokens,
} from '@shared/token-estimator';
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

export function SelectionScreen({ spec, onContinue }: SelectionScreenProps) {
  const selection = useSelection(spec);
  const [activeTag, setActiveTag] = useState<string | null>(
    spec.groups[0]?.tag ?? null
  );
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const allEndpoints = useMemo(
    () => spec.groups.flatMap((g) => g.endpoints),
    [spec]
  );

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

  const visibleEndpoints = useMemo(() => {
    const source = activeTag === null
      ? allEndpoints
      : (spec.groups.find((g) => g.tag === activeTag)?.endpoints ?? []);
    return source.filter((ep) => {
      if (!passesFilter(ep, filterMode)) return false;
      return matchesQuery(ep, query);
    });
  }, [spec, activeTag, allEndpoints, filterMode, query]);

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

  const totalCount = allEndpoints.length;

  const tagRailItems = useMemo(
    () =>
      spec.groups.map((g) => {
        const counts = selection.tagCounts.get(g.tag) ?? { picked: 0, total: g.endpoints.length };
        return { name: g.tag, picked: counts.picked, total: counts.total };
      }),
    [spec, selection.tagCounts]
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* 3-pane split */}
      <div className="flex min-h-0 flex-1">
        <TagRail
          tags={tagRailItems}
          activeTag={activeTag}
          onSelectTag={setActiveTag}
          selectedCount={selection.count}
          totalCount={totalCount}
        />

        {/* Centre — list */}
        <section className="flex min-w-0 flex-1 flex-col">
          {/* Action bar */}
          <div className="flex items-center gap-8 border-b border-border px-4 py-2.5">
            <SearchBox
              value={query}
              onChange={setQuery}
              placeholder={
                activeTag === null
                  ? 'Search every endpoint…'
                  : `Search in ${activeTag}…`
              }
              className="w-64"
            />
            <FilterChips value={filterMode} onChange={setFilterMode} />
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
                  onFocus={selection.setFocused}
                  onToggle={selection.toggle}
                />
              ))
            )}
          </div>
        </section>

        <EndpointPreview
          endpoint={focusedEndpoint}
          estimatedTokens={focusedEndpoint ? tokensById.get(focusedEndpoint.id) ?? 0 : 0}
          savedPercent={economy.percent}
          selectedCount={selection.count}
          totalCount={totalCount}
          sliceTokens={economy.selected}
          fullTokens={fullTokens}
        />
      </div>

      <StickyFooter
        selectedCount={selection.count}
        onContinue={() => onContinue(selection.selectedIds())}
      />
    </div>
  );
}

import { useCallback, useMemo, useState } from 'react';
import type { Endpoint, ParsedSpec } from '@shared/types';
import { computeEconomy } from '@shared/token-estimator';
import { ApiHeader } from '@/components/api-header';
import { BulkActions } from '@/components/bulk-actions';
import { EndpointGroup } from '@/components/endpoint-group';
import { SearchBox } from '@/components/search-box';
import { SelectionSidebar } from '@/components/selection-sidebar';
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

export function SelectionScreen({ spec, onContinue }: SelectionScreenProps) {
  const selection = useSelection(spec);
  const [query, setQuery] = useState('');
  // TODO (phase 06): bubble baseUrl edits up to App.tsx so the config
  // screen sees the user's override. Today the edit lives only inside this
  // component and is dropped on the floor when leaving screen 2.
  const [baseUrl, setBaseUrl] = useState(spec.baseUrl);
  // 12.c — deprecated endpoints hidden by default.
  const [showDeprecated, setShowDeprecated] = useState(false);

  const deprecatedCount = useMemo(
    () => spec.groups.reduce((acc, g) => acc + g.endpoints.filter((e) => e.deprecated).length, 0),
    [spec]
  );

  // Pre-compute the filtered, group-by-group view. Memoised on
  // (spec, query, showDeprecated) so typing only rebuilds when needed.
  // Empty groups are dropped so the user doesn't see headers with no rows.
  const visibleGroups = useMemo(() => {
    return spec.groups
      .map((g) => ({
        ...g,
        endpoints: g.endpoints.filter((e) => {
          if (!showDeprecated && e.deprecated) return false;
          return matchesQuery(e, query);
        }),
      }))
      .filter((g) => g.endpoints.length > 0);
  }, [spec, query, showDeprecated]);

  const totalCount = useMemo(
    () =>
      spec.groups.reduce(
        (acc, g) => acc + g.endpoints.filter((e) => showDeprecated || !e.deprecated).length,
        0
      ),
    [spec, showDeprecated]
  );

  // Recompute the savings counter on every selection change. The estimator
  // is pure, scans the spec once — cheap even on Stripe-200 (~3k tokens).
  const savedPercent = useMemo(
    () => computeEconomy(spec, selection.selectedIds()).percent,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spec, selection.count, selection.selectedIds]
  );

  const isVisible = useCallback(
    (e: Endpoint) => {
      if (!showDeprecated && e.deprecated) return false;
      return matchesQuery(e, query);
    },
    [query, showDeprecated]
  );

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <ApiHeader
        apiName={spec.apiName}
        apiVersion={spec.apiVersion}
        baseUrl={baseUrl}
        onBaseUrlChange={setBaseUrl}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-4">
          <SearchBox value={query} onChange={setQuery} />
          <BulkActions
            onCheckReads={() =>
              selection.bulkCheck((e) => e.method === 'GET', isVisible)
            }
            onCheckWrites={() =>
              selection.bulkCheck((e) => e.method !== 'GET', isVisible)
            }
            onUncheckAll={selection.bulkUncheck}
          />

          <div className="flex flex-col gap-3">
            {visibleGroups.length === 0 ? (
              <p className="font-mono text-sm text-muted-foreground">
                No endpoints match this search.
              </p>
            ) : (
              visibleGroups.map((g) => (
                <EndpointGroup
                  key={g.tag}
                  group={g}
                  isSelected={selection.isSelected}
                  onToggle={selection.toggle}
                />
              ))
            )}
          </div>
        </div>

        <SelectionSidebar
          selectedCount={selection.count}
          totalCount={totalCount}
          savedPercent={savedPercent}
          excludedCount={spec.excludedCount}
          deprecatedCount={deprecatedCount}
          showDeprecated={showDeprecated}
          onToggleDeprecated={() => setShowDeprecated((s) => !s)}
          onContinue={() => onContinue(selection.selectedIds())}
        />
      </div>
    </section>
  );
}

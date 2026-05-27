import { useCallback, useMemo, useState } from 'react';
import type { Endpoint, ParsedSpec } from '@shared/types';

export interface UseSelectionApi {
  /** Number of currently selected endpoints. */
  count: number;
  /** Whether `id` is currently selected. */
  isSelected: (id: string) => boolean;
  /** Add or remove an endpoint from the selection. */
  toggle: (id: string) => void;
  /**
   * Add every endpoint that matches `predicate` to the selection. An optional
   * `visible` filter narrows the candidate set — used by bulk actions to
   * respect the current search filter (SPEC R1.2.6).
   */
  bulkCheck: (
    predicate: (endpoint: Endpoint) => boolean,
    visible?: (endpoint: Endpoint) => boolean
  ) => void;
  /** Empty the selection. */
  bulkUncheck: () => void;
  /** Snapshot of selected ids — returns a fresh array each call. */
  selectedIds: () => string[];
}

function flattenEndpoints(spec: ParsedSpec): Endpoint[] {
  return spec.groups.flatMap((g) => g.endpoints);
}

function initialSelection(spec: ParsedSpec): Set<string> {
  // R1.2.7 — every GET pre-selected, writes off by default. A read accidentally
  // forgotten is cheaper than a write enabled unintentionally.
  // 12.c — deprecated endpoints are hidden by default in the UI, so they
  // must not silently land in the selection set either (would produce the
  // confusing "4 / 3 endpoints" counter once the toggle is off).
  const set = new Set<string>();
  for (const ep of flattenEndpoints(spec)) {
    if (ep.method === 'GET' && !ep.deprecated) set.add(ep.id);
  }
  return set;
}

export function useSelection(spec: ParsedSpec): UseSelectionApi {
  const [selected, setSelected] = useState<Set<string>>(() => initialSelection(spec));
  const allEndpoints = useMemo(() => flattenEndpoints(spec), [spec]);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const bulkCheck = useCallback(
    (predicate: (e: Endpoint) => boolean, visible?: (e: Endpoint) => boolean) => {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const ep of allEndpoints) {
          if (visible && !visible(ep)) continue;
          if (predicate(ep)) next.add(ep.id);
        }
        return next;
      });
    },
    [allEndpoints]
  );

  const bulkUncheck = useCallback(() => {
    setSelected(new Set());
  }, []);

  const selectedIds = useCallback(() => Array.from(selected), [selected]);

  return {
    count: selected.size,
    isSelected,
    toggle,
    bulkCheck,
    bulkUncheck,
    selectedIds,
  };
}

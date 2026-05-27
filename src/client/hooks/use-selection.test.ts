import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ParsedSpec } from '@shared/types';
import { useSelection } from './use-selection';

const SPEC: ParsedSpec = {
  apiName: 'Demo',
  apiVersion: '1.0',
  baseUrl: 'https://api.demo',
  authType: 'none',
  groups: [
    {
      tag: 'Things',
      endpoints: [
        { id: 'GET /things', method: 'GET', path: '/things', label: 'list', params: [] },
        { id: 'POST /things', method: 'POST', path: '/things', label: 'create', params: [] },
        { id: 'GET /things/{id}', method: 'GET', path: '/things/{id}', label: 'get one', params: [] },
        { id: 'DELETE /things/{id}', method: 'DELETE', path: '/things/{id}', label: 'delete', params: [] },
      ],
    },
    {
      tag: 'Other',
      endpoints: [
        { id: 'PUT /other', method: 'PUT', path: '/other', label: 'update', params: [] },
      ],
    },
  ],
};

describe('useSelection', () => {
  it('initialises with every GET pre-selected and writes unselected (R1.2.7)', () => {
    const { result } = renderHook(() => useSelection(SPEC));
    const selected = result.current.selectedIds();
    expect(selected.sort()).toEqual(['GET /things', 'GET /things/{id}']);
    expect(result.current.isSelected('POST /things')).toBe(false);
    expect(result.current.isSelected('DELETE /things/{id}')).toBe(false);
    expect(result.current.isSelected('PUT /other')).toBe(false);
  });

  it('toggle() adds an unselected id and removes a selected one', () => {
    const { result } = renderHook(() => useSelection(SPEC));
    act(() => result.current.toggle('POST /things'));
    expect(result.current.isSelected('POST /things')).toBe(true);
    act(() => result.current.toggle('POST /things'));
    expect(result.current.isSelected('POST /things')).toBe(false);

    // Initially selected → toggling removes it.
    act(() => result.current.toggle('GET /things'));
    expect(result.current.isSelected('GET /things')).toBe(false);
  });

  it('count() returns the current selection size', () => {
    const { result } = renderHook(() => useSelection(SPEC));
    expect(result.current.count).toBe(2); // 2 GETs pre-selected
    act(() => result.current.toggle('POST /things'));
    expect(result.current.count).toBe(3);
  });

  it('bulkCheck(predicate) adds every endpoint matching the predicate', () => {
    const { result } = renderHook(() => useSelection(SPEC));
    // Start fresh: unselect everything first.
    act(() => result.current.bulkUncheck());
    expect(result.current.count).toBe(0);
    // Then bulk-check all writes (POST/PUT/PATCH/DELETE) — R1.2.6.
    act(() =>
      result.current.bulkCheck((e) => e.method !== 'GET')
    );
    expect(result.current.count).toBe(3); // POST, DELETE, PUT
    expect(result.current.isSelected('POST /things')).toBe(true);
    expect(result.current.isSelected('PUT /other')).toBe(true);
    expect(result.current.isSelected('GET /things')).toBe(false);
  });

  it('bulkCheck respects an optional visibility filter (e.g. search) — R1.2.6', () => {
    const { result } = renderHook(() => useSelection(SPEC));
    act(() => result.current.bulkUncheck());
    // Only consider endpoints whose label contains "list" — i.e. just GET /things.
    act(() =>
      result.current.bulkCheck(
        (e) => e.method === 'GET',
        (e) => e.label.includes('list')
      )
    );
    expect(result.current.selectedIds()).toEqual(['GET /things']);
  });

  it('bulkUncheck() empties the selection', () => {
    const { result } = renderHook(() => useSelection(SPEC));
    expect(result.current.count).toBeGreaterThan(0);
    act(() => result.current.bulkUncheck());
    expect(result.current.count).toBe(0);
    expect(result.current.selectedIds()).toEqual([]);
  });

  it('selectedIds() returns a fresh array on every call (no shared mutable state leakage)', () => {
    const { result } = renderHook(() => useSelection(SPEC));
    const a = result.current.selectedIds();
    const b = result.current.selectedIds();
    expect(a).not.toBe(b); // different references
    expect(a).toEqual(b);  // same content
  });
});

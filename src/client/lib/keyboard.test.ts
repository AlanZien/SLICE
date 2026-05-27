import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcut } from './keyboard';

describe('useKeyboardShortcut', () => {
  it('fires the callback on Meta+K (macOS ⌘K)', () => {
    const cb = vi.fn();
    renderHook(() => useKeyboardShortcut('cmd+k', cb));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
    expect(cb).toHaveBeenCalledOnce();
  });

  it('fires the callback on Ctrl+K (Windows/Linux equivalent)', () => {
    const cb = vi.fn();
    renderHook(() => useKeyboardShortcut('cmd+k', cb));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    expect(cb).toHaveBeenCalledOnce();
  });

  it('ignores plain "k" without modifier', () => {
    const cb = vi.fn();
    renderHook(() => useKeyboardShortcut('cmd+k', cb));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
    expect(cb).not.toHaveBeenCalled();
  });

  it('detaches the listener on unmount (no leak)', () => {
    const cb = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcut('cmd+k', cb));
    unmount();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
    expect(cb).not.toHaveBeenCalled();
  });
});

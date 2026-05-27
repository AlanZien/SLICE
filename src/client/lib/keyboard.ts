import { useEffect } from 'react';

export type ShortcutId = 'cmd+k';

/**
 * Cross-platform shortcut hook. We only need 'cmd+k' for now (focus search);
 * the type is narrowed so adding more keys later forces a touchpoint.
 *
 * On macOS we listen for `metaKey`; on Windows/Linux we also accept `ctrlKey`
 * so the same chord works (per typical native app convention).
 */
export function useKeyboardShortcut(id: ShortcutId, callback: () => void): void {
  useEffect(() => {
    if (id !== 'cmd+k') return;
    const handler = (event: KeyboardEvent) => {
      const isK = event.key === 'k' || event.key === 'K';
      if (!isK) return;
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      callback();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [id, callback]);
}

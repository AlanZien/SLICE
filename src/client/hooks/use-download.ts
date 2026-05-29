import { useCallback, useEffect, useRef } from 'react';

/**
 * Module-level memo of blobs whose automatic download has already fired.
 * A `WeakSet` lets the browser GC the blob entry as soon as the React tree
 * stops referencing it — we don't leak memory across regenerations.
 *
 * Why module-level (not per-hook)? React.StrictMode mounts effects twice in
 * dev (mount → unmount → mount) to surface side-effect bugs. A per-hook
 * `useRef` would reset on the second mount and we'd see two "Save as…"
 * dialogs. The WeakSet survives the unmount, so the second mount sees the
 * blob has already been downloaded and skips.
 */
const downloadedBlobs = new WeakSet<Blob>();

/**
 * Drive browser-side downloads of an in-memory blob.
 *
 * Pattern: once the success screen mounts with a fresh blob it kicks off the
 * download automatically (mirrors the "your file is ready" UX). The same
 * blob is kept in a ref so the user can re-download without round-tripping
 * the server — the cost is one O(1) `URL.createObjectURL` per click.
 */
export interface UseDownloadResult {
  /** Re-trigger the download from the cached blob. No-op if `blob` is null. */
  redownload: () => void;
}

export function useDownload(blob: Blob | null, filename: string): UseDownloadResult {
  // Stash the latest blob so `redownload` can run even after the parent
  // component re-renders without retriggering the auto-download effect.
  const blobRef = useRef<Blob | null>(blob);
  blobRef.current = blob;

  const trigger = useCallback((b: Blob, name: string) => {
    const url = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke on the next tick so the browser has time to start the download.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, []);

  useEffect(() => {
    if (!blob) return;
    if (downloadedBlobs.has(blob)) return;
    downloadedBlobs.add(blob);
    trigger(blob, filename);
    // Intentionally only re-run when the blob reference changes — we don't
    // want a filename rename to re-trigger a download.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob]);

  const redownload = useCallback(() => {
    const b = blobRef.current;
    if (!b) return;
    trigger(b, filename);
  }, [filename, trigger]);

  return { redownload };
}

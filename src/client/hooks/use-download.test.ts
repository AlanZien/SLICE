import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDownload } from './use-download';

describe('useDownload', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let appendChild: (node: Node) => void;
  let removeChild: (node: Node) => void;
  let anchorClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:fake');
    revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;

    anchorClick = vi.fn();
    appendChild = vi.fn() as unknown as (node: Node) => void;
    removeChild = vi.fn() as unknown as (node: Node) => void;
    // Wrap real DOM methods: only intercept anchor creation (which is what
    // the hook produces); everything else (React's div tree, etc.) must pass
    // through untouched so `renderHook` can mount.
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return { href: '', download: '', click: anchorClick } as unknown as HTMLAnchorElement;
      }
      return realCreate(tag);
    });
    const realAppend = document.body.appendChild.bind(document.body);
    vi.spyOn(document.body, 'appendChild').mockImplementation(((node: Node) => {
      if (node instanceof HTMLAnchorElement || (node as { click?: unknown }).click === anchorClick) {
        appendChild(node);
        return node;
      }
      return realAppend(node);
    }) as typeof document.body.appendChild);
    const realRemove = document.body.removeChild.bind(document.body);
    vi.spyOn(document.body, 'removeChild').mockImplementation(((node: Node) => {
      if ((node as { click?: unknown }).click === anchorClick) {
        removeChild(node);
        return node;
      }
      return realRemove(node);
    }) as typeof document.body.removeChild);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers a download immediately when given a blob', () => {
    const blob = new Blob(['x']);
    renderHook(() => useDownload(blob, 'demo.zip'));
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(anchorClick).toHaveBeenCalledTimes(1);
  });

  it('does nothing when blob is null', () => {
    renderHook(() => useDownload(null, 'demo.zip'));
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(anchorClick).not.toHaveBeenCalled();
  });

  it('only triggers ONE download even when mounted twice (React.StrictMode)', () => {
    const blob = new Blob(['x']);
    const { unmount } = renderHook(() => useDownload(blob, 'demo.zip'));
    unmount();
    renderHook(() => useDownload(blob, 'demo.zip'));
    expect(anchorClick).toHaveBeenCalledTimes(1);
  });

  it('exposes redownload() that reuses the same blob without re-fetching', () => {
    const blob = new Blob(['x']);
    const { result } = renderHook(() => useDownload(blob, 'demo.zip'));
    createObjectURL.mockClear();
    anchorClick.mockClear();
    act(() => result.current.redownload());
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(anchorClick).toHaveBeenCalledTimes(1);
  });
});

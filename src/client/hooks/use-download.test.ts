import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDownload } from './use-download';

describe('useDownload', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let appendChild: ReturnType<typeof vi.fn>;
  let removeChild: ReturnType<typeof vi.fn>;
  let anchorClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:fake');
    revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;

    anchorClick = vi.fn();
    appendChild = vi.fn();
    removeChild = vi.fn();
    vi.spyOn(document.body, 'appendChild').mockImplementation(appendChild);
    vi.spyOn(document.body, 'removeChild').mockImplementation(removeChild);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return {
          href: '',
          download: '',
          click: anchorClick,
        } as unknown as HTMLAnchorElement;
      }
      return {} as HTMLElement;
    });
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

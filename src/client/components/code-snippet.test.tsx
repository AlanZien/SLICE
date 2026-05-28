import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { CodeSnippet } from './code-snippet';
import { ToastProvider } from './toast';

describe('<CodeSnippet />', () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the code content inside a <pre>', () => {
    render(
      <ToastProvider>
        <CodeSnippet code={'foo\nbar'} label="JSON" />
      </ToastProvider>
    );
    const pre = screen.getByText(/foo/).closest('pre');
    expect(pre).not.toBeNull();
  });

  it('copies the code to clipboard when the Copy button is clicked', async () => {
    render(
      <ToastProvider>
        <CodeSnippet code={'hello'} label="JSON" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('shows "Copied" feedback for 1.5s after a successful copy', async () => {
    render(
      <ToastProvider>
        <CodeSnippet code={'hello'} label="JSON" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));
    // Wait for the writeText promise + setState to resolve.
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole('button').textContent).toMatch(/copied/i);
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByRole('button').textContent).toMatch(/copy/i);
  });
});

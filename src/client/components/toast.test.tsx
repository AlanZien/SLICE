import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from './toast';

function Trigger({ variant = 'success' as 'success' | 'error', message = 'Copied' }) {
  const { push } = useToast();
  return (
    <button onClick={() => push({ variant, message })}>fire</button>
  );
}

describe('<Toast />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows nothing initially', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders a success toast via role="status" when pushed', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    act(() => {
      screen.getByText('fire').click();
    });
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('Copied');
  });

  it('renders an error toast via role="alert" with longer dismiss', () => {
    render(
      <ToastProvider>
        <Trigger variant="error" message="Bad" />
      </ToastProvider>
    );
    act(() => {
      screen.getByText('fire').click();
    });
    expect(screen.getByRole('alert').textContent).toBe('Bad');
    // Still visible after 4s (success timeout)…
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByRole('alert')).not.toBeNull();
    // …gone after 6s.
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('auto-dismisses success after 4s', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    act(() => {
      screen.getByText('fire').click();
    });
    expect(screen.getByRole('status')).not.toBeNull();
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByRole('status')).toBeNull();
  });
});

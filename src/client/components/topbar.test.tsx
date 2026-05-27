import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Topbar } from './topbar';

describe('Topbar', () => {
  it('renders the SLICE wordmark', () => {
    render(<Topbar current={1} apiSlug={null} onReset={() => {}} onToggleTheme={() => {}} />);
    expect(screen.getByText('SLICE')).toBeInTheDocument();
  });

  it('shows the breadcrumb "/new" on step 1', () => {
    render(<Topbar current={1} apiSlug={null} onReset={() => {}} onToggleTheme={() => {}} />);
    expect(screen.getByLabelText(/breadcrumb/i)).toHaveTextContent('/new');
  });

  it('shows the api slug breadcrumb on step 2', () => {
    render(
      <Topbar
        current={2}
        apiSlug="shopify-admin-api"
        onReset={() => {}}
        onToggleTheme={() => {}}
      />
    );
    expect(screen.getByLabelText(/breadcrumb/i)).toHaveTextContent('/shopify-admin-api');
  });

  it('shows /configure on step 3 and /done on step 4', () => {
    const { rerender } = render(
      <Topbar current={3} apiSlug="x" onReset={() => {}} onToggleTheme={() => {}} />
    );
    expect(screen.getByLabelText(/breadcrumb/i)).toHaveTextContent('/configure');

    rerender(<Topbar current={4} apiSlug="x" onReset={() => {}} onToggleTheme={() => {}} />);
    expect(screen.getByLabelText(/breadcrumb/i)).toHaveTextContent('/done');
  });

  it('renders the Stepper with the current step', () => {
    render(<Topbar current={2} apiSlug="x" onReset={() => {}} onToggleTheme={() => {}} />);
    expect(screen.getByRole('navigation', { name: /steps/i })).toBeInTheDocument();
  });

  it('shows the ⌘K keyboard hint', () => {
    render(<Topbar current={1} apiSlug={null} onReset={() => {}} onToggleTheme={() => {}} />);
    expect(screen.getByText('⌘')).toBeInTheDocument();
    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('calls onReset when the Reset button is clicked', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<Topbar current={2} apiSlug="x" onReset={onReset} onToggleTheme={() => {}} />);
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('calls onToggleTheme when the theme button is clicked', async () => {
    const user = userEvent.setup();
    const onToggleTheme = vi.fn();
    render(
      <Topbar current={1} apiSlug={null} onReset={() => {}} onToggleTheme={onToggleTheme} />
    );
    await user.click(screen.getByRole('button', { name: /toggle theme/i }));
    expect(onToggleTheme).toHaveBeenCalledOnce();
  });
});

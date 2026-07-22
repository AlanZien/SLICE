import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Topbar } from './topbar';

describe('Topbar', () => {
  it('renders the SLICE wordmark', () => {
    render(<Topbar current={1} apiName={null} onReset={() => {}} onToggleTheme={() => {}} />);
    expect(screen.getByText('SLICE')).toBeInTheDocument();
  });

  it('shows the API name when provided', () => {
    render(<Topbar current={2} apiName="Shopify Admin API" onReset={() => {}} onToggleTheme={() => {}} />);
    expect(screen.getByText('Shopify Admin API')).toBeInTheDocument();
  });

  it('hides the API name on step 1 when null', () => {
    render(<Topbar current={1} apiName={null} onReset={() => {}} onToggleTheme={() => {}} />);
    expect(screen.queryByText(/shopify/i)).not.toBeInTheDocument();
  });

  it('renders the Stepper with the current step', () => {
    render(<Topbar current={2} apiName="x" onReset={() => {}} onToggleTheme={() => {}} />);
    expect(screen.getByRole('navigation', { name: /steps/i })).toBeInTheDocument();
  });

  it('calls onReset when the Reset button is clicked', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<Topbar current={2} apiName="x" onReset={onReset} onToggleTheme={() => {}} />);
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('calls onToggleTheme when the theme button is clicked', async () => {
    const user = userEvent.setup();
    const onToggleTheme = vi.fn();
    render(
      <Topbar current={1} apiName={null} onReset={() => {}} onToggleTheme={onToggleTheme} />
    );
    await user.click(screen.getByRole('button', { name: /toggle theme/i }));
    expect(onToggleTheme).toHaveBeenCalledOnce();
  });

  it('passes onNavigate to done steps in the Stepper', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <Topbar current={3} apiName="x" onReset={() => {}} onToggleTheme={() => {}} onNavigate={onNavigate} />
    );
    await user.click(screen.getByRole('button', { name: /back to upload/i }));
    expect(onNavigate).toHaveBeenCalledWith(1);
  });
});

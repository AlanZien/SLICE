import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StickyFooter } from './sticky-footer';

describe('<StickyFooter>', () => {
  it('renders the (icon-only) Back button with an accessible label', () => {
    render(
      <StickyFooter selectedCount={3} onBack={() => {}} onContinue={() => {}} />
    );
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('disables Continue when nothing is selected', () => {
    render(
      <StickyFooter selectedCount={0} onBack={() => {}} onContinue={() => {}} />
    );
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('enables Continue as soon as one endpoint is selected', () => {
    render(
      <StickyFooter selectedCount={3} onBack={() => {}} onContinue={() => {}} />
    );
    expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled();
  });

  it('calls onBack when the Back button is clicked', async () => {
    const onBack = vi.fn();
    render(
      <StickyFooter selectedCount={3} onBack={onBack} onContinue={() => {}} />
    );
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('calls onContinue when Continue is clicked', async () => {
    const onContinue = vi.fn();
    render(
      <StickyFooter selectedCount={3} onBack={() => {}} onContinue={onContinue} />
    );
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('no longer renders the X endpoints · −Y% summary (now lives in the rail)', () => {
    render(
      <StickyFooter selectedCount={12} onBack={() => {}} onContinue={() => {}} />
    );
    expect(screen.queryByText(/12 endpoints/i)).not.toBeInTheDocument();
  });
});

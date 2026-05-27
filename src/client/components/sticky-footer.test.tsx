import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StickyFooter } from './sticky-footer';

describe('<StickyFooter>', () => {
  it('renders the summary and a disabled Continue when nothing is selected', () => {
    render(
      <StickyFooter selectedCount={0} savedPercent={100} onBack={() => {}} onContinue={() => {}} />
    );
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('enables Continue as soon as one endpoint is selected', () => {
    render(
      <StickyFooter selectedCount={3} savedPercent={70} onBack={() => {}} onContinue={() => {}} />
    );
    expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled();
  });

  it('calls onBack when the Back button is clicked', async () => {
    const onBack = vi.fn();
    render(
      <StickyFooter selectedCount={3} savedPercent={70} onBack={onBack} onContinue={() => {}} />
    );
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('calls onContinue when Continue is clicked', async () => {
    const onContinue = vi.fn();
    render(
      <StickyFooter selectedCount={3} savedPercent={70} onBack={() => {}} onContinue={onContinue} />
    );
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('shows the live count and savings in the summary', () => {
    render(
      <StickyFooter selectedCount={12} savedPercent={64} onBack={() => {}} onContinue={() => {}} />
    );
    expect(screen.getByText(/12/)).toBeInTheDocument();
    expect(screen.getByText(/64/)).toBeInTheDocument();
  });
});

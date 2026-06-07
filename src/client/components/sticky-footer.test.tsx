import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StickyFooter } from './sticky-footer';

describe('<StickyFooter>', () => {
  it('disables Continue when nothing is selected', () => {
    render(<StickyFooter selectedCount={0} onContinue={() => {}} />);
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('enables Continue as soon as one endpoint is selected', () => {
    render(<StickyFooter selectedCount={3} onContinue={() => {}} />);
    expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled();
  });

  it('calls onContinue when Continue is clicked', async () => {
    const onContinue = vi.fn();
    render(<StickyFooter selectedCount={3} onContinue={onContinue} />);
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onContinue).toHaveBeenCalledOnce();
  });


});

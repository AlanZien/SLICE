import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectionSidebar } from './selection-sidebar';

describe('<SelectionSidebar>', () => {
  it('shows the X / Y endpoints counter', () => {
    render(
      <SelectionSidebar selectedCount={3} totalCount={10} onContinue={() => {}} />
    );
    expect(screen.getByText(/3\s*\/\s*10/)).toBeInTheDocument();
  });

  it('disables the Continue button when zero endpoints are selected (R1.2.9)', () => {
    render(
      <SelectionSidebar selectedCount={0} totalCount={10} onContinue={() => {}} />
    );
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('enables the Continue button as soon as one endpoint is selected', () => {
    render(
      <SelectionSidebar selectedCount={1} totalCount={10} onContinue={() => {}} />
    );
    expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled();
  });

  it('calls onContinue when the button is clicked', async () => {
    const onContinue = vi.fn();
    render(
      <SelectionSidebar selectedCount={2} totalCount={10} onContinue={onContinue} />
    );
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('shows a savings placeholder until phase 05 calibrates the token counter', () => {
    render(
      <SelectionSidebar selectedCount={2} totalCount={10} onContinue={() => {}} />
    );
    // The bignum is a placeholder; we just assert it renders something
    // recognisable so the layout reserves the right space.
    expect(screen.getByLabelText(/context saved/i)).toBeInTheDocument();
  });
});

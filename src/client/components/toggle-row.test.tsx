import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToggleRow } from './toggle-row';

describe('<ToggleRow>', () => {
  it('renders title and hint', () => {
    render(<ToggleRow title="Retries" hint="3 attempts" on={false} onToggle={() => {}} />);
    expect(screen.getByText('Retries')).toBeInTheDocument();
    expect(screen.getByText('3 attempts')).toBeInTheDocument();
  });

  it('reflects the on/off state via aria-pressed', () => {
    const { rerender } = render(<ToggleRow title="x" on={false} onToggle={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    rerender(<ToggleRow title="x" on={true} onToggle={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('fires onToggle when the switch is clicked', async () => {
    const onToggle = vi.fn();
    render(<ToggleRow title="x" on={false} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});

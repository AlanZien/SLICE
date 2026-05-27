import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterChips } from './filter-chips';

describe('<FilterChips>', () => {
  it('renders the 3 modes', () => {
    render(<FilterChips value="all" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reads/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /writes/i })).toBeInTheDocument();
  });

  it('marks the active mode with aria-pressed', () => {
    render(<FilterChips value="read" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /reads/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /writes/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it.each([
    ['all', /all/i],
    ['read', /reads/i],
    ['write', /writes/i],
  ] as const)('fires onChange with %s when the chip is clicked', async (value, label) => {
    const onChange = vi.fn();
    render(<FilterChips value="all" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: label }));
    expect(onChange).toHaveBeenCalledWith(value);
  });
});

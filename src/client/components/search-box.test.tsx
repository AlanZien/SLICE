import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBox } from './search-box';

describe('<SearchBox>', () => {
  it('renders the placeholder and the ⌘K hint', () => {
    render(<SearchBox value="" onChange={() => {}} />);
    expect(screen.getByPlaceholderText(/search endpoints/i)).toBeInTheDocument();
    expect(screen.getByText(/⌘/)).toBeInTheDocument();
    expect(screen.getByText(/K/)).toBeInTheDocument();
  });

  it('calls onChange when the user types', async () => {
    const onChange = vi.fn();
    render(<SearchBox value="" onChange={onChange} />);
    await userEvent.type(screen.getByRole('searchbox'), 'pro');
    // userEvent.type fires onChange for each character.
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenLastCalledWith('o');
  });

  it('focuses the input when ⌘K / Ctrl+K is pressed', () => {
    render(<SearchBox value="" onChange={() => {}} />);
    const input = screen.getByRole('searchbox');
    expect(document.activeElement).not.toBe(input);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
    expect(document.activeElement).toBe(input);
  });
});

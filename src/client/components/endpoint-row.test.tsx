import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Endpoint } from '@shared/types';
import { EndpointRow } from './endpoint-row';

const EP: Endpoint = {
  id: 'GET /things',
  method: 'GET',
  path: '/things',
  label: 'List things',
  params: [],
};

describe('<EndpointRow>', () => {
  const baseProps = {
    endpoint: EP,
    selected: false,
    focused: false,
    estimatedTokens: 42,
    onToggle: () => {},
    onFocus: () => {},
  };

  it('renders label, method and path', () => {
    render(<EndpointRow {...baseProps} />);
    expect(screen.getByText('List things')).toBeInTheDocument();
    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByText('/things')).toBeInTheDocument();
  });

  it('does not render the per-row token cost (lives in the preview pane)', () => {
    render(<EndpointRow {...baseProps} estimatedTokens={42} />);
    expect(screen.queryByText(/42/)).not.toBeInTheDocument();
  });

  it('reflects the selected state on the checkbox', () => {
    const { rerender } = render(<EndpointRow {...baseProps} selected={false} />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    rerender(<EndpointRow {...baseProps} selected={true} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('marks the row with aria-current when focused', () => {
    const { container, rerender } = render(<EndpointRow {...baseProps} focused={false} />);
    const row = container.firstChild as HTMLElement;
    expect(row).not.toHaveAttribute('aria-current');
    rerender(<EndpointRow {...baseProps} focused={true} />);
    expect(row).toHaveAttribute('aria-current', 'true');
  });

  it('clicking the row body fires onFocus (not onToggle)', async () => {
    const onFocus = vi.fn();
    const onToggle = vi.fn();
    render(<EndpointRow {...baseProps} onFocus={onFocus} onToggle={onToggle} />);
    await userEvent.click(screen.getByText('List things'));
    expect(onFocus).toHaveBeenCalledWith('GET /things');
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('clicking the checkbox fires onToggle (not onFocus)', async () => {
    const onFocus = vi.fn();
    const onToggle = vi.fn();
    render(<EndpointRow {...baseProps} onFocus={onFocus} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith('GET /things');
    expect(onFocus).not.toHaveBeenCalled();
  });
});

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
  it('renders label, method and path', () => {
    render(<EndpointRow endpoint={EP} selected={false} onToggle={() => {}} />);
    expect(screen.getByText('List things')).toBeInTheDocument();
    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByText('/things')).toBeInTheDocument();
  });

  it('reflects the selected state on the checkbox', () => {
    const { rerender } = render(
      <EndpointRow endpoint={EP} selected={false} onToggle={() => {}} />
    );
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    rerender(<EndpointRow endpoint={EP} selected={true} onToggle={() => {}} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('calls onToggle when the row label is clicked', async () => {
    const onToggle = vi.fn();
    render(<EndpointRow endpoint={EP} selected={false} onToggle={onToggle} />);
    // Clicking the row text bubbles to the wrapping <label>, which toggles
    // the associated checkbox and fires its `onChange`.
    await userEvent.click(screen.getByText('List things'));
    expect(onToggle).toHaveBeenCalledWith('GET /things');
  });

  it('calls onToggle when the checkbox itself is clicked (no double-fire)', async () => {
    const onToggle = vi.fn();
    render(<EndpointRow endpoint={EP} selected={false} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

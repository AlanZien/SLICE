import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EndpointGroup as EndpointGroupModel } from '@shared/types';
import { EndpointGroup } from './endpoint-group';

const GROUP: EndpointGroupModel = {
  tag: 'Things',
  endpoints: [
    { id: 'GET /things', method: 'GET', path: '/things', label: 'List things', params: [] },
    { id: 'POST /things', method: 'POST', path: '/things', label: 'Create a thing', params: [] },
    { id: 'DELETE /things/{id}', method: 'DELETE', path: '/things/{id}', label: 'Delete a thing', params: [] },
  ],
};

describe('<EndpointGroup>', () => {
  it('renders the tag name and the X/Y selection counter', () => {
    render(
      <EndpointGroup
        group={GROUP}
        isSelected={(id) => id === 'GET /things'}
        onToggle={() => {}}
      />
    );
    expect(screen.getByText('Things')).toBeInTheDocument();
    expect(screen.getByText(/1\s*\/\s*3/)).toBeInTheDocument();
  });

  it('renders every endpoint row by default (open accordion — R1.2.4)', () => {
    render(
      <EndpointGroup group={GROUP} isSelected={() => false} onToggle={() => {}} />
    );
    expect(screen.getByText('List things')).toBeInTheDocument();
    expect(screen.getByText('Create a thing')).toBeInTheDocument();
    expect(screen.getByText('Delete a thing')).toBeInTheDocument();
  });

  it('collapses when the header is clicked', async () => {
    render(
      <EndpointGroup group={GROUP} isSelected={() => false} onToggle={() => {}} />
    );
    // The accordion header is the only `aria-expanded` element in the
    // tree — endpoint rows use `aria-pressed`.
    const header = document.querySelector('[aria-expanded]') as HTMLElement;
    expect(header).not.toBeNull();
    await userEvent.click(header);
    expect(screen.queryByText('List things')).not.toBeInTheDocument();
  });
});

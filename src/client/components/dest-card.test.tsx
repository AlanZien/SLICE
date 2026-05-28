import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DestCard } from './dest-card';

describe('<DestCard>', () => {
  it('renders title, blurb, apps and transport spec', () => {
    render(
      <DestCard
        value="local"
        active={false}
        onSelect={() => {}}
        title="On my machine"
        blurb="The agent reads it locally."
        apps={['Claude Desktop', 'Cursor']}
        transport="stdio"
      />
    );
    expect(screen.getByText('On my machine')).toBeInTheDocument();
    expect(screen.getByText(/reads it locally/i)).toBeInTheDocument();
    expect(screen.getByText('Claude Desktop')).toBeInTheDocument();
    expect(screen.getByText('stdio')).toBeInTheDocument();
  });

  it('marks the active card with aria-pressed', () => {
    render(
      <DestCard value="remote" active={true} onSelect={() => {}} title="x" blurb="y" apps={[]} transport="http" />
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders a "Recommended" badge when recommended is set', () => {
    render(
      <DestCard value="both" active={false} onSelect={() => {}} title="x" blurb="y" apps={[]} transport="stdio + http" recommended />
    );
    expect(screen.getByText(/recommended/i)).toBeInTheDocument();
  });

  it('fires onSelect with the value when clicked', async () => {
    const onSelect = vi.fn();
    render(
      <DestCard value="local" active={false} onSelect={onSelect} title="x" blurb="y" apps={[]} transport="stdio" />
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('local');
  });
});

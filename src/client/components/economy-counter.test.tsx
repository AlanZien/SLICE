import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EconomyCounter } from './economy-counter';

describe('<EconomyCounter>', () => {
  it('renders the percentage with the % sign', () => {
    render(<EconomyCounter percent={73} />);
    expect(screen.getByText('73%')).toBeInTheDocument();
  });

  it('renders the "Context saved" label', () => {
    render(<EconomyCounter percent={50} />);
    expect(screen.getByText(/context saved/i)).toBeInTheDocument();
  });

  it('clamps a negative percent to 0', () => {
    render(<EconomyCounter percent={-5} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('clamps a percent over 100 to 100', () => {
    render(<EconomyCounter percent={150} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows a caption explaining the comparison baseline', () => {
    render(<EconomyCounter percent={42} />);
    expect(screen.getByText(/vs\.?\s*exposing the full spec/i)).toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Stepper, STEPS } from './stepper';

describe('Stepper', () => {
  it('renders all 4 SLICE steps', () => {
    render(<Stepper current={1} />);
    const nav = screen.getByRole('navigation', { name: /steps/i });
    expect(within(nav).getAllByRole('listitem')).toHaveLength(STEPS.length);
    expect(STEPS).toHaveLength(4);
  });

  it('marks the current step with aria-current', () => {
    render(<Stepper current={2} />);
    const current = screen.getByRole('listitem', { current: 'step' });
    expect(current).toHaveTextContent('Select');
  });

  it('marks previous steps as done with a checkmark', () => {
    render(<Stepper current={3} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('data-state', 'done');
    expect(items[1]).toHaveAttribute('data-state', 'done');
    expect(items[2]).toHaveAttribute('data-state', 'now');
    expect(items[3]).toHaveAttribute('data-state', 'upcoming');
  });

  it('only shows the step name for the current step', () => {
    render(<Stepper current={2} />);
    expect(screen.getByText('Select')).toBeInTheDocument();
    expect(screen.queryByText('Upload')).not.toBeInTheDocument();
    expect(screen.queryByText('Configure')).not.toBeInTheDocument();
  });

  it('renders done step indicators with a checkmark glyph', () => {
    render(<Stepper current={4} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('✓');
    expect(items[1]).toHaveTextContent('✓');
    expect(items[2]).toHaveTextContent('✓');
    expect(items[3]).toHaveTextContent('4');
  });
});

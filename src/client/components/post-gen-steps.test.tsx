import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostGenSteps } from './post-gen-steps';

describe('<PostGenSteps>', () => {
  it('renders three numbered steps', () => {
    render(<PostGenSteps />);
    const list = screen.getByRole('list');
    expect(list.children.length).toBe(3);
  });

  it('mentions download / env / agent snippet', () => {
    render(<PostGenSteps />);
    expect(screen.getByText(/download/i)).toBeInTheDocument();
    expect(screen.getByText(/\.env/i)).toBeInTheDocument();
    expect(screen.getByText(/agent/i)).toBeInTheDocument();
  });
});

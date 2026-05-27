import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MethodBadge } from './method-badge';

describe('<MethodBadge>', () => {
  it.each(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const)('renders the %s label', (method) => {
    render(<MethodBadge method={method} />);
    expect(screen.getByText(method)).toBeInTheDocument();
  });

  it('tags the badge with data-method so styling is method-specific', () => {
    const { container, rerender } = render(<MethodBadge method="GET" />);
    expect(container.firstChild).toHaveAttribute('data-method', 'GET');
    rerender(<MethodBadge method="DELETE" />);
    expect(container.firstChild).toHaveAttribute('data-method', 'DELETE');
  });

  it('exposes the method as an accessible label', () => {
    render(<MethodBadge method="POST" />);
    expect(screen.getByLabelText(/HTTP method: POST/i)).toBeInTheDocument();
  });
});

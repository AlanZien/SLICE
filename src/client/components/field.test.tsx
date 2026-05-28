import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Field } from './field';

describe('<Field>', () => {
  it('renders label + value + hint', () => {
    render(
      <Field label="MCP name" hint="auto-detected from the spec" value="shopify-admin" onChange={() => {}} />
    );
    expect(screen.getByText('MCP name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('shopify-admin')).toBeInTheDocument();
    expect(screen.getByText(/auto-detected/i)).toBeInTheDocument();
  });

  it('calls onChange when typing', async () => {
    const onChange = vi.fn();
    render(<Field label="x" value="" onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('renders an error message and aria-invalid when error is set', () => {
    render(<Field label="x" value="bad" error="not allowed" onChange={() => {}} />);
    expect(screen.getByText(/not allowed/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders a prefix when given', () => {
    render(<Field label="x" value="abc" prefix="@" onChange={() => {}} />);
    expect(screen.getByText('@')).toBeInTheDocument();
  });
});

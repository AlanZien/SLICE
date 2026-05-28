import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthOption } from './auth-option';

describe('<AuthOption>', () => {
  it('renders title and hint', () => {
    render(
      <AuthOption value="none" active={false} onSelect={() => {}} title="None" hint="public API" />
    );
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByText('public API')).toBeInTheDocument();
  });

  it('uses aria-pressed for the active state', () => {
    const { rerender } = render(
      <AuthOption value="bearer" active={false} onSelect={() => {}} title="Bearer" />
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    rerender(<AuthOption value="bearer" active={true} onSelect={() => {}} title="Bearer" />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the "auto" badge when detected from the spec', () => {
    render(
      <AuthOption value="apiKey" active={false} onSelect={() => {}} title="API Key" detected />
    );
    expect(screen.getByText(/auto/i)).toBeInTheDocument();
  });

  it('fires onSelect with the option value when clicked', async () => {
    const onSelect = vi.fn();
    render(
      <AuthOption value="bearer" active={false} onSelect={onSelect} title="Bearer" />
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('bearer');
  });
});

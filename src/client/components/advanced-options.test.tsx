import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdvancedOptions } from './advanced-options';

describe('<AdvancedOptions>', () => {
  it('renders collapsed by default — body hidden', () => {
    render(
      <AdvancedOptions>
        <p>body content</p>
      </AdvancedOptions>
    );
    expect(screen.queryByText('body content')).not.toBeInTheDocument();
  });

  it('expands when the header is clicked', async () => {
    render(
      <AdvancedOptions>
        <p>body content</p>
      </AdvancedOptions>
    );
    await userEvent.click(screen.getByRole('button', { name: /advanced/i }));
    expect(screen.getByText('body content')).toBeInTheDocument();
  });

  it('uses aria-expanded to reflect the state', async () => {
    render(<AdvancedOptions>{null}</AdvancedOptions>);
    const trigger = screen.getByRole('button', { name: /advanced/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});

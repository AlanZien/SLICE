import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiHeader } from './api-header';

describe('<ApiHeader>', () => {
  it('renders the API name, version, and base URL', () => {
    render(
      <ApiHeader
        apiName="Shopify"
        apiVersion="2024-04"
        baseUrl="https://example.myshopify.com"
        onBaseUrlChange={() => {}}
      />
    );
    expect(screen.getByText('Shopify')).toBeInTheDocument();
    expect(screen.getByText(/2024-04/)).toBeInTheDocument();
    expect(screen.getByText('https://example.myshopify.com')).toBeInTheDocument();
  });

  it('switches the base URL into an editable input when clicked', async () => {
    render(
      <ApiHeader
        apiName="x"
        apiVersion="v1"
        baseUrl="https://api.example.test"
        onBaseUrlChange={() => {}}
      />
    );
    await userEvent.click(screen.getByText('https://api.example.test'));
    expect(screen.getByRole('textbox')).toHaveValue('https://api.example.test');
  });

  it('saves the edited value on Enter and calls onBaseUrlChange', async () => {
    const onChange = vi.fn();
    render(
      <ApiHeader
        apiName="x"
        apiVersion="v1"
        baseUrl="https://api.example.test"
        onBaseUrlChange={onChange}
      />
    );
    await userEvent.click(screen.getByText('https://api.example.test'));
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, 'https://new.api.test');
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('https://new.api.test');
    // The input collapses back to display mode.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('cancels the edit on Escape and reverts to the original value', async () => {
    const onChange = vi.fn();
    render(
      <ApiHeader
        apiName="x"
        apiVersion="v1"
        baseUrl="https://api.example.test"
        onBaseUrlChange={onChange}
      />
    );
    await userEvent.click(screen.getByText('https://api.example.test'));
    await userEvent.type(screen.getByRole('textbox'), '/extra');
    await userEvent.keyboard('{Escape}');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('https://api.example.test')).toBeInTheDocument();
  });
});

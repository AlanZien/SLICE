import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Endpoint } from '@shared/types';
import { EndpointPreview } from './endpoint-preview';

const EP: Endpoint = {
  id: 'GET /products/{id}',
  method: 'GET',
  path: '/products/{id}',
  label: 'Get a product',
  description: 'Fetch a single product by its identifier.',
  params: [
    { name: 'id', in: 'path', type: 'string', required: true },
    { name: 'fields', in: 'query', type: 'string', required: false, description: 'comma-separated' },
  ],
};

describe('<EndpointPreview>', () => {
  it('renders the method, path, label and description', () => {
    render(<EndpointPreview endpoint={EP} selected={false} estimatedTokens={120} onToggle={() => {}} />);
    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByText('/products/{id}')).toBeInTheDocument();
    expect(screen.getByText('Get a product')).toBeInTheDocument();
    expect(screen.getByText(/fetch a single product/i)).toBeInTheDocument();
  });

  it('lists every parameter with its requirement', () => {
    render(<EndpointPreview endpoint={EP} selected={false} estimatedTokens={120} onToggle={() => {}} />);
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText(/required/i)).toBeInTheDocument();
    expect(screen.getByText('fields')).toBeInTheDocument();
    expect(screen.getByText(/optional/i)).toBeInTheDocument();
  });

  it('shows "no parameters" when the endpoint has none', () => {
    const bare: Endpoint = { ...EP, params: [] };
    render(<EndpointPreview endpoint={bare} selected={false} estimatedTokens={50} onToggle={() => {}} />);
    expect(screen.getByText(/no parameters/i)).toBeInTheDocument();
  });

  it('shows the estimated token cost', () => {
    render(<EndpointPreview endpoint={EP} selected={false} estimatedTokens={123} onToggle={() => {}} />);
    // Scope to the "context cost" string so the sample snippet's id:"123"
    // (sampleValue for id-like params) doesn't collide.
    expect(screen.getByText(/~\s*123 tokens/i)).toBeInTheDocument();
  });

  it('renders an "Add to MCP" button when not selected, "Included" otherwise', () => {
    const { rerender } = render(
      <EndpointPreview endpoint={EP} selected={false} estimatedTokens={120} onToggle={() => {}} />
    );
    expect(screen.getByRole('button', { name: /add to mcp/i })).toBeInTheDocument();
    rerender(<EndpointPreview endpoint={EP} selected={true} estimatedTokens={120} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: /included in mcp/i })).toBeInTheDocument();
  });

  it('calls onToggle when the button is clicked', async () => {
    const onToggle = vi.fn();
    render(<EndpointPreview endpoint={EP} selected={false} estimatedTokens={120} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: /add to mcp/i }));
    expect(onToggle).toHaveBeenCalledWith('GET /products/{id}');
  });

  it('shows an "Agent call" sample snippet using the tool name + required params', () => {
    render(<EndpointPreview endpoint={EP} selected={false} estimatedTokens={120} onToggle={() => {}} />);
    expect(screen.getByText(/agent call/i)).toBeInTheDocument();
    const snippet = document.querySelector('pre')?.textContent ?? '';
    expect(snippet).toMatch(/await mcp\.tools\["get_products\.id"\]/);
    expect(snippet).toContain('id: "123"');
  });

  it('shows {} for an endpoint with no required params in the agent call', () => {
    const bare: Endpoint = { ...EP, params: [] };
    render(<EndpointPreview endpoint={bare} selected={false} estimatedTokens={50} onToggle={() => {}} />);
    const snippet = document.querySelector('pre')?.textContent ?? '';
    expect(snippet).toMatch(/\(\{\}\)/);
  });

  it('renders an empty state when no endpoint is focused', () => {
    render(<EndpointPreview endpoint={null} selected={false} estimatedTokens={0} onToggle={() => {}} />);
    expect(screen.getByText(/select an endpoint/i)).toBeInTheDocument();
  });
});

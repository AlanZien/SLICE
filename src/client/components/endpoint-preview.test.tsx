import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    render(<EndpointPreview endpoint={EP} estimatedTokens={120} />);
    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByText('/products/{id}')).toBeInTheDocument();
    expect(screen.getByText('Get a product')).toBeInTheDocument();
    expect(screen.getByText(/fetch a single product/i)).toBeInTheDocument();
  });

  it('lists every parameter with its requirement', () => {
    render(<EndpointPreview endpoint={EP} estimatedTokens={120} />);
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText(/required/i)).toBeInTheDocument();
    expect(screen.getByText('fields')).toBeInTheDocument();
    expect(screen.getByText(/optional/i)).toBeInTheDocument();
  });

  it('shows "no parameters" when the endpoint has none', () => {
    const bare: Endpoint = { ...EP, params: [] };
    render(<EndpointPreview endpoint={bare} estimatedTokens={50} />);
    expect(screen.getByText(/no parameters/i)).toBeInTheDocument();
  });

  it('shows the estimated token cost', () => {
    render(<EndpointPreview endpoint={EP} estimatedTokens={123} />);
    expect(screen.getByText(/~\s*123 tokens/i)).toBeInTheDocument();
  });

  it('shows an "Agent call" sample snippet using the tool name + required params', () => {
    render(<EndpointPreview endpoint={EP} estimatedTokens={120} />);
    expect(screen.getByText(/agent call/i)).toBeInTheDocument();
    const snippet = document.querySelector('pre')?.textContent ?? '';
    expect(snippet).toMatch(/await mcp\.tools\["get_products\.id"\]/);
    expect(snippet).toContain('id: "123"');
  });

  it('shows {} for an endpoint with no required params in the agent call', () => {
    const bare: Endpoint = { ...EP, params: [] };
    render(<EndpointPreview endpoint={bare} estimatedTokens={50} />);
    const snippet = document.querySelector('pre')?.textContent ?? '';
    expect(snippet).toMatch(/\(\{\}\)/);
  });

  it('renders an empty state when no endpoint is focused', () => {
    render(<EndpointPreview endpoint={null} estimatedTokens={0} />);
    expect(screen.getByText(/select an endpoint/i)).toBeInTheDocument();
  });

  it('does not render any action button (selection lives in the list checkbox)', () => {
    render(<EndpointPreview endpoint={EP} estimatedTokens={120} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

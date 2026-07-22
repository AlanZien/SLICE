import { describe, it, expect } from 'vitest';
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

const DEFAULTS = {
  estimatedTokens: 123,
  savedPercent: 71,
  selectedCount: 5,
  totalCount: 20,
  sliceTokens: 1000,
  fullTokens: 5000,
};

describe('<EndpointPreview>', () => {
  it('defaults to the Endpoint tab and renders method, path, label', () => {
    render(<EndpointPreview endpoint={EP} {...DEFAULTS} />);
    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByText('/products/{id}')).toBeInTheDocument();
    expect(screen.getByText('Get a product')).toBeInTheDocument();
  });

  it('lists every parameter with its requirement', () => {
    render(<EndpointPreview endpoint={EP} {...DEFAULTS} />);
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText(/required/i)).toBeInTheDocument();
    expect(screen.getByText('fields')).toBeInTheDocument();
    expect(screen.getByText(/optional/i)).toBeInTheDocument();
  });

  it('shows the estimated token cost', () => {
    render(<EndpointPreview endpoint={EP} {...DEFAULTS} />);
    expect(screen.getByText(/~\s*123 tokens/i)).toBeInTheDocument();
  });

  it('shows an "Agent call" sample snippet', () => {
    render(<EndpointPreview endpoint={EP} {...DEFAULTS} />);
    const snippet = document.querySelector('pre')?.textContent ?? '';
    expect(snippet).toMatch(/await mcp\.tools\["get_products\.id"\]/);
    expect(snippet).toContain('id: "123"');
  });

  it('renders an empty state on Endpoint tab when no endpoint is focused', () => {
    render(<EndpointPreview endpoint={null} {...DEFAULTS} />);
    expect(screen.getByText(/select an endpoint/i)).toBeInTheDocument();
  });

  it('switches to Overview tab and shows global metrics', async () => {
    const user = userEvent.setup();
    render(<EndpointPreview endpoint={EP} {...DEFAULTS} />);
    await user.click(screen.getByRole('button', { name: /overview/i }));
    expect(screen.getByText(/agent scope/i)).toBeInTheDocument();
    expect(screen.getByText(/context saved/i)).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.textContent?.replace(/\s+/g, ' ').trim() === '5 / 20 endpoints')).toBeInTheDocument();
  });
});

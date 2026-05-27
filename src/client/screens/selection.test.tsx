import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ParsedSpec } from '@shared/types';
import { SelectionScreen } from './selection';

const SPEC: ParsedSpec = {
  apiName: 'Shop',
  apiVersion: '1.0',
  baseUrl: 'https://api.shop.test',
  authType: 'none',
  groups: [
    {
      tag: 'Products',
      endpoints: [
        { id: 'GET /products', method: 'GET', path: '/products', label: 'List products', params: [] },
        { id: 'POST /products', method: 'POST', path: '/products', label: 'Create a product', params: [] },
      ],
    },
    {
      tag: 'Orders',
      endpoints: [
        { id: 'GET /orders', method: 'GET', path: '/orders', label: 'List orders', params: [] },
      ],
    },
  ],
};

describe('<SelectionScreen>', () => {
  it('renders the API header, search box, both groups and the sidebar', () => {
    render(<SelectionScreen spec={SPEC} onContinue={() => {}} />);
    expect(screen.getByText('Shop')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('hands the current selection to onContinue', async () => {
    const onContinue = vi.fn();
    render(<SelectionScreen spec={SPEC} onContinue={onContinue} />);
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    // GET /products and GET /orders pre-selected by useSelection (R1.2.7).
    expect(onContinue).toHaveBeenCalledWith(
      expect.arrayContaining(['GET /products', 'GET /orders'])
    );
    expect(onContinue.mock.calls[0][0]).toHaveLength(2);
  });

  it('filters visible endpoints by label or path (R1.2.5, case-insensitive)', async () => {
    render(<SelectionScreen spec={SPEC} onContinue={() => {}} />);
    const search = screen.getByRole('searchbox');
    await userEvent.type(search, 'order');
    // Orders group / matching endpoints stay; Products endpoints disappear.
    expect(screen.getByText('List orders')).toBeInTheDocument();
    expect(screen.queryByText('List products')).not.toBeInTheDocument();
    expect(screen.queryByText('Create a product')).not.toBeInTheDocument();
  });

  it('"Check all writes" toggles every non-GET visible endpoint (R1.2.6)', async () => {
    const onContinue = vi.fn();
    render(<SelectionScreen spec={SPEC} onContinue={onContinue} />);
    await userEvent.click(screen.getByRole('button', { name: /check all writes/i }));
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onContinue.mock.calls[0][0]).toEqual(
      expect.arrayContaining(['POST /products', 'GET /products', 'GET /orders'])
    );
  });
});

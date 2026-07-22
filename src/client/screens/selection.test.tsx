import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

describe('<SelectionScreen> 3-col layout (phase 04bis)', () => {
  it('renders the tag rail, action bar, list and preview pane', () => {
    render(<SelectionScreen spec={SPEC} onContinue={() => {}} />);
    // Rail items
    expect(screen.getByRole('button', { name: /^tag: all$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^tag: products$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^tag: orders$/i })).toBeInTheDocument();
    // Search box
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    // Sticky footer Continue button
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('shows endpoints from the first tag by default', () => {
    render(<SelectionScreen spec={SPEC} onContinue={() => {}} />);
    // Rows show paths only — labels live in the preview pane.
    expect(screen.getAllByText('/products').length).toBeGreaterThan(0);
    expect(screen.queryByText('/orders')).not.toBeInTheDocument();
  });

  it('switches the centre list when a rail tag is clicked', async () => {
    render(<SelectionScreen spec={SPEC} onContinue={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /^tag: orders$/i }));
    expect(screen.getAllByText('List orders').length).toBeGreaterThan(0);
    expect(screen.queryByText('List products')).not.toBeInTheDocument();
  });

  it('"All" reveals every endpoint across tags', async () => {
    render(<SelectionScreen spec={SPEC} onContinue={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /^tag: all$/i }));
    expect(screen.getAllByText('/products').length).toBeGreaterThan(0);
    expect(screen.getAllByText('/orders').length).toBeGreaterThan(0);
  });

  it('clicking a row focuses it without toggling the checkbox', async () => {
    render(<SelectionScreen spec={SPEC} onContinue={() => {}} />);
    // Switch to Orders tag to get a unique path (/orders).
    await userEvent.click(screen.getByRole('button', { name: /^tag: orders$/i }));
    await userEvent.click(screen.getAllByText('/orders')[0]);
    // Right preview reflects the focused endpoint (Endpoint tab is default).
    const preview = screen.getByRole('button', { name: /endpoint/i }).closest('aside') as HTMLElement;
    expect(within(preview).getByText('List orders')).toBeInTheDocument();
  });

  it('"Select all" checks every visible endpoint at once', async () => {
    const onContinue = vi.fn();
    render(<SelectionScreen spec={SPEC} onContinue={onContinue} />);
    // Tag "All" → the 3 endpoints are visible; only the 2 GETs are pre-selected.
    await userEvent.click(screen.getByRole('button', { name: /^tag: all$/i }));
    await userEvent.click(screen.getByRole('checkbox', { name: /select all/i }));
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onContinue.mock.calls[0][0].sort()).toEqual([
      'GET /orders',
      'GET /products',
      'POST /products',
    ]);
  });

  it('filters by reads/writes via the FilterChips', async () => {
    render(<SelectionScreen spec={SPEC} onContinue={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /^writes$/i }));
    // "List products" is GET → not in the list anymore. Preview may still
    // show it (auto-focus on the new list's first row swaps it though).
    const lists = screen.queryAllByText('List products');
    expect(lists.length).toBeLessThanOrEqual(1); // possibly still in preview
    expect(screen.getAllByText('Create a product').length).toBeGreaterThan(0);
  });

  it('Continue calls onContinue with the selected ids', async () => {
    const onContinue = vi.fn();
    render(<SelectionScreen spec={SPEC} onContinue={onContinue} />);
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    // GETs are pre-selected (R1.2.7): GET /products + GET /orders.
    expect(onContinue.mock.calls[0][0].sort()).toEqual(['GET /orders', 'GET /products']);
  });

  it('shows an empty state inside the centre list when search has no match', async () => {
    render(<SelectionScreen spec={SPEC} onContinue={() => {}} />);
    await userEvent.type(screen.getByRole('searchbox'), 'xxx-nope');
    expect(screen.getByText(/no endpoints match/i)).toBeInTheDocument();
  });
});

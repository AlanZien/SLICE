import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagRail } from './tag-rail';

const TAGS = [
  { name: 'Products', picked: 5, total: 8 },
  { name: 'Orders', picked: 2, total: 6 },
  { name: 'Customers', picked: 0, total: 4 },
];

describe('<TagRail>', () => {
  it('renders an "All" item plus one item per tag', () => {
    render(
      <TagRail
        tags={TAGS}
        activeTag="Products"
        onSelectTag={() => {}}
        savedPercent={50}
        selectedCount={7}
        totalCount={18}
        sliceTokens={500}
        fullTokens={1000}
      />
    );
    expect(screen.getByText(/^all$/i)).toBeInTheDocument();
    for (const t of TAGS) {
      expect(screen.getByText(t.name)).toBeInTheDocument();
    }
  });

  it('shows the active tag with aria-current="true"', () => {
    render(
      <TagRail
        tags={TAGS}
        activeTag="Orders"
        onSelectTag={() => {}}
        savedPercent={50}
        selectedCount={7}
        totalCount={18}
        sliceTokens={500}
        fullTokens={1000}
      />
    );
    const orders = screen.getByRole('button', { name: /orders/i });
    expect(orders).toHaveAttribute('aria-current', 'true');
  });

  it('calls onSelectTag with the tag name when an item is clicked', async () => {
    const onSelectTag = vi.fn();
    render(
      <TagRail
        tags={TAGS}
        activeTag="Products"
        onSelectTag={onSelectTag}
        savedPercent={50}
        selectedCount={7}
        totalCount={18}
        sliceTokens={500}
        fullTokens={1000}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /orders/i }));
    expect(onSelectTag).toHaveBeenCalledWith('Orders');
  });

  it('calls onSelectTag with null when "All" is clicked', async () => {
    const onSelectTag = vi.fn();
    render(
      <TagRail
        tags={TAGS}
        activeTag="Products"
        onSelectTag={onSelectTag}
        savedPercent={50}
        selectedCount={7}
        totalCount={18}
        sliceTokens={500}
        fullTokens={1000}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /^all$/i }));
    expect(onSelectTag).toHaveBeenCalledWith(null);
  });

  it('renders the savings bignum and tokens summary in the footer', () => {
    render(
      <TagRail
        tags={TAGS}
        activeTag="Products"
        onSelectTag={() => {}}
        savedPercent={73}
        selectedCount={7}
        totalCount={18}
        sliceTokens={500}
        fullTokens={1850}
      />
    );
    expect(screen.getByText(/−73|−\s*73|-73/)).toBeInTheDocument();
    expect(screen.getByText(/7\s*\/\s*18/)).toBeInTheDocument();
    expect(screen.getByText(/500/)).toBeInTheDocument();
    expect(screen.getByText(/1850|1\s*850/)).toBeInTheDocument();
  });

  it('shows picked/total per tag (formatted)', () => {
    render(
      <TagRail
        tags={TAGS}
        activeTag="Products"
        onSelectTag={() => {}}
        savedPercent={0}
        selectedCount={0}
        totalCount={18}
        sliceTokens={0}
        fullTokens={0}
      />
    );
    // Products: 5/8 → both numbers visible
    const productsItem = screen.getByRole('button', { name: /products/i });
    expect(productsItem).toHaveTextContent('5');
    expect(productsItem).toHaveTextContent('8');
  });
});

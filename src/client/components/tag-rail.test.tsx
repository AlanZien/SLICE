import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagRail } from './tag-rail';

const TAGS = [
  { name: 'Products', picked: 5, total: 8 },
  { name: 'Orders', picked: 2, total: 6 },
  { name: 'Customers', picked: 0, total: 4 },
];

const DEFAULT_PROPS = {
  tags: TAGS,
  activeTag: 'Products' as string | null,
  onSelectTag: () => {},
  selectedCount: 7,
  totalCount: 18,
};

describe('<TagRail>', () => {
  it('renders an "All" item plus one item per tag', () => {
    render(<TagRail {...DEFAULT_PROPS} />);
    expect(screen.getByText(/^all$/i)).toBeInTheDocument();
    for (const t of TAGS) {
      expect(screen.getByText(t.name)).toBeInTheDocument();
    }
  });

  it('shows the active tag with aria-current="true"', () => {
    render(<TagRail {...DEFAULT_PROPS} activeTag="Orders" />);
    const orders = screen.getByRole('button', { name: /tag: orders/i });
    expect(orders).toHaveAttribute('aria-current', 'true');
  });

  it('calls onSelectTag with the tag name when an item is clicked', async () => {
    const onSelectTag = vi.fn();
    render(<TagRail {...DEFAULT_PROPS} onSelectTag={onSelectTag} />);
    await userEvent.click(screen.getByRole('button', { name: /tag: orders/i }));
    expect(onSelectTag).toHaveBeenCalledWith('Orders');
  });

  it('calls onSelectTag with null when "All" is clicked', async () => {
    const onSelectTag = vi.fn();
    render(<TagRail {...DEFAULT_PROPS} onSelectTag={onSelectTag} />);
    await userEvent.click(screen.getByRole('button', { name: /tag: all/i }));
    expect(onSelectTag).toHaveBeenCalledWith(null);
  });

  it('renders selected / total in the footer', () => {
    render(<TagRail {...DEFAULT_PROPS} selectedCount={7} totalCount={18} />);
    expect(screen.getByText(/7/)).toBeInTheDocument();
    expect(screen.getByText(/18/)).toBeInTheDocument();
  });

  it('shows picked/total per tag (formatted)', () => {
    render(<TagRail {...DEFAULT_PROPS} />);
    const productsItem = screen.getByRole('button', { name: /tag: products/i });
    expect(productsItem).toHaveTextContent('5');
    expect(productsItem).toHaveTextContent('8');
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ZipStructurePreview } from './zip-structure-preview';

describe('<ZipStructurePreview>', () => {
  it('renders the package name as the root directory', () => {
    render(<ZipStructurePreview packageName="shopify-mcp" mode="local" />);
    expect(screen.getByText(/shopify-mcp\//)).toBeInTheDocument();
  });

  it('shows stdio entry as ✓ and http entry as — for local mode', () => {
    render(<ZipStructurePreview packageName="x" mode="local" />);
    const code = screen.getByRole('region', { name: /zip structure/i });
    expect(code.textContent).toMatch(/index\.js\s+✓/);
    expect(code.textContent).toMatch(/http\.js\s+—/);
  });

  it('shows http entry as ✓ and stdio entry as — for remote mode', () => {
    render(<ZipStructurePreview packageName="x" mode="remote" />);
    const code = screen.getByRole('region', { name: /zip structure/i });
    expect(code.textContent).toMatch(/index\.js\s+—/);
    expect(code.textContent).toMatch(/http\.js\s+✓/);
  });

  it('shows both entries as ✓ for both mode', () => {
    render(<ZipStructurePreview packageName="x" mode="both" />);
    const code = screen.getByRole('region', { name: /zip structure/i });
    expect(code.textContent).toMatch(/index\.js\s+✓/);
    expect(code.textContent).toMatch(/http\.js\s+✓/);
  });

  it('always lists .env.example, package.json, README.md', () => {
    render(<ZipStructurePreview packageName="x" mode="both" />);
    const code = screen.getByRole('region', { name: /zip structure/i });
    expect(code.textContent).toContain('.env.example');
    expect(code.textContent).toContain('package.json');
    expect(code.textContent).toContain('README.md');
  });
});

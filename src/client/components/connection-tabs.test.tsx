import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectionTabs } from './connection-tabs';
import { ToastProvider } from './toast';
import type { SliceConfig } from '@shared/types';

const BASE: SliceConfig = {
  mcpName: 'shopify-admin',
  baseUrl: 'https://api.demo.test',
  upstreamAuth: { type: 'apiKey', headerName: 'X-Demo' },
  mode: 'both',
  mcpServerToken: 'a'.repeat(32),
  includeParamDescriptions: false,
  retryOnServerError: false,
};

function setup(over: Partial<SliceConfig> = {}) {
  return render(
    <ToastProvider>
      <ConnectionTabs config={{ ...BASE, ...over }} />
    </ToastProvider>
  );
}

describe('<ConnectionTabs />', () => {
  it('renders all three tabs in mode=both', () => {
    setup({ mode: 'both' });
    expect(screen.getByRole('tab', { name: /claude desktop/i })).not.toBeNull();
    expect(screen.getByRole('tab', { name: /n8n/i })).not.toBeNull();
    expect(screen.getByRole('tab', { name: /airia/i })).not.toBeNull();
  });

  it('defaults to the Claude Desktop tab when stdio is available', () => {
    setup({ mode: 'both' });
    const claude = screen.getByRole('tab', { name: /claude desktop/i });
    expect(claude.getAttribute('aria-selected')).toBe('true');
  });

  it('disables Claude Desktop when mode=remote (http-only)', () => {
    setup({ mode: 'remote' });
    const claude = screen.getByRole('tab', { name: /claude desktop/i });
    expect(claude.getAttribute('aria-disabled')).toBe('true');
  });

  it('disables n8n and Airia when mode=local (stdio-only)', () => {
    setup({ mode: 'local' });
    expect(screen.getByRole('tab', { name: /n8n/i }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('tab', { name: /airia/i }).getAttribute('aria-disabled')).toBe('true');
  });

  it('switches tab on arrow-right key', () => {
    setup({ mode: 'both' });
    const tablist = screen.getByRole('tablist');
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: /n8n/i }).getAttribute('aria-selected')).toBe('true');
  });
});

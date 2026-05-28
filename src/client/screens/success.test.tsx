import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuccessScreen } from './success';
import { ToastProvider } from '../components/toast';
import type { SliceConfig } from '@shared/types';

const CONFIG: SliceConfig = {
  mcpName: 'shopify-admin',
  baseUrl: 'https://example.myshopify.com/admin/api/2024-04',
  upstreamAuth: { type: 'apiKey', headerName: 'X-Shopify-Access-Token' },
  mode: 'both',
  mcpServerToken: 'a'.repeat(32),
  includeParamDescriptions: false,
  retryOnServerError: false,
};

function setup(over: { economySnapshot?: number; endpointCount?: number; blob?: Blob } = {}) {
  // jsdom doesn't ship URL.createObjectURL — stub before the hook fires.
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  const onRestart = vi.fn();
  const onBackToSelection = vi.fn();
  render(
    <ToastProvider>
      <SuccessScreen
        config={CONFIG}
        endpointCount={over.endpointCount ?? 23}
        economySnapshot={over.economySnapshot ?? 74}
        zipBlob={over.blob ?? new Blob(['x'])}
        onRestart={onRestart}
        onBackToSelection={onBackToSelection}
      />
    </ToastProvider>
  );
  return { onRestart, onBackToSelection };
}

describe('<SuccessScreen />', () => {
  it('renders the headline + recap with the configured mcpName', () => {
    setup();
    expect(screen.getAllByText(/shopify-admin/).length).toBeGreaterThan(0);
    expect(screen.getByText(/23 endpoints/i)).not.toBeNull();
  });

  it('shows the economy snapshot value passed in (not recomputed)', () => {
    setup({ economySnapshot: 88 });
    expect(screen.getByText(/88/)).not.toBeNull();
  });

  it('renders the connection tabs so the user can copy a snippet', () => {
    setup();
    expect(screen.getByRole('tab', { name: /claude desktop/i })).not.toBeNull();
  });

  it('fires onRestart when "Generate another MCP" is clicked', () => {
    const { onRestart } = setup();
    fireEvent.click(screen.getByRole('button', { name: /generate another/i }));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('fires onBackToSelection when the secondary CTA is clicked', () => {
    const { onBackToSelection } = setup();
    fireEvent.click(screen.getByRole('button', { name: /back to selection/i }));
    expect(onBackToSelection).toHaveBeenCalledTimes(1);
  });
});

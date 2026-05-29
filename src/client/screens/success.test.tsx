import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SuccessScreen } from './success';
import { ToastProvider } from '../components/toast';
import type { BinaryTarget, SliceConfig } from '@shared/types';

const CONFIG: SliceConfig = {
  mcpName: 'shopify-admin',
  baseUrl: 'https://example.myshopify.com/admin/api/2024-04',
  upstreamAuth: { type: 'apiKey', headerName: 'X-Shopify-Access-Token' },
  mode: 'both',
  mcpServerToken: 'a'.repeat(32),
  includeParamDescriptions: false,
  retryOnServerError: false,
};

interface SetupOptions {
  economySnapshot?: number;
  endpointCount?: number;
  primaryBlob?: Blob;
  primaryTarget?: BinaryTarget;
  fetchOther?: (target: BinaryTarget) => Promise<{ blob: Blob; filename: string }>;
}

function setup(over: SetupOptions = {}) {
  // jsdom doesn't ship URL.createObjectURL — stub before any download fires.
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  const onRestart = vi.fn();
  const onBackToSelection = vi.fn();
  const fetchOther =
    over.fetchOther ??
    vi.fn(async (t: BinaryTarget) => ({
      blob: new Blob(['other']),
      filename: `shopify-admin-${t}${t === 'windows-x64' ? '.exe' : ''}`,
    }));
  render(
    <ToastProvider>
      <SuccessScreen
        config={CONFIG}
        endpointCount={over.endpointCount ?? 23}
        economySnapshot={over.economySnapshot ?? 74}
        primaryBinary={{
          blob: over.primaryBlob ?? new Blob(['mac-bin']),
          filename: 'shopify-admin-macos-arm64',
          target: over.primaryTarget ?? 'macos-arm64',
        }}
        fetchOtherBinary={fetchOther}
        onRestart={onRestart}
        onBackToSelection={onBackToSelection}
      />
    </ToastProvider>
  );
  return { onRestart, onBackToSelection, fetchOther };
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

  it('exposes a primary download button labelled for the detected OS', () => {
    setup({ primaryTarget: 'macos-arm64' });
    expect(screen.getByRole('button', { name: /download for mac/i })).not.toBeNull();
  });

  it('exposes a secondary download button for the other OS', () => {
    setup({ primaryTarget: 'macos-arm64' });
    expect(screen.getByRole('button', { name: /download for windows/i })).not.toBeNull();
  });

  it('calls fetchOtherBinary with the right target when secondary button is clicked', async () => {
    const { fetchOther } = setup({ primaryTarget: 'macos-arm64' });
    fireEvent.click(screen.getByRole('button', { name: /download for windows/i }));
    await waitFor(() => expect(fetchOther).toHaveBeenCalledWith('windows-x64'));
  });

  it('no longer mentions pnpm or unzip steps (binary is self-contained)', () => {
    setup();
    expect(screen.queryByText(/pnpm install/i)).toBeNull();
    expect(screen.queryByText(/unzip/i)).toBeNull();
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

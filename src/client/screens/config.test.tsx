import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ParsedSpec } from '@shared/types';
import { ToastProvider } from '@/components/toast';
import { ConfigScreen } from './config';

function renderConfig(props: React.ComponentProps<typeof ConfigScreen>) {
  return render(<ToastProvider><ConfigScreen {...props} /></ToastProvider>);
}

const SPEC: ParsedSpec = {
  apiName: 'Shopify',
  apiVersion: '2024-04',
  baseUrl: 'https://api.shopify.com/v1',
  authType: 'apiKey',
  authHeader: 'X-API-Key',
  groups: [],
  defaultConfig: {
    mcpName: 'shopify',
    baseUrl: 'https://api.shopify.com/v1',
    upstreamAuth: { type: 'apiKey', headerName: 'X-API-Key' },
    mcpServerToken: 'a'.repeat(32),
  },
};

const SPEC_NO_AUTH: ParsedSpec = {
  ...SPEC,
  authType: 'none',
  authHeader: undefined,
  defaultConfig: {
    mcpName: 'shopify',
    baseUrl: 'https://api.shopify.com/v1',
    upstreamAuth: { type: 'none' },
    mcpServerToken: 'a'.repeat(32),
  },
};

describe('<ConfigScreen> (phase 06)', () => {
  it('pins the upstream auth in read-only mode when detected from the spec', () => {
    renderConfig({ spec: SPEC, selectedIds: ['GET /a'], onGenerate: () => {} });
    // Pinned state: status block + "auto-detected" badge, no clickable
    // None/Bearer alternatives.
    expect(screen.getByRole('status', { name: /upstream authentication/i })).toBeInTheDocument();
    // There are two auto-detected badges (auth + base URL).
    expect(screen.getAllByText(/auto-detected/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('button', { name: /^bearer$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^none$/i })).not.toBeInTheDocument();
  });

  it('exposes the 3 auth options when the spec did not declare any', () => {
    renderConfig({ spec: SPEC_NO_AUTH, selectedIds: ['GET /a'], onGenerate: () => {} });
    expect(screen.getByRole('button', { name: /none\s+public api/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /api key/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bearer/i })).toBeInTheDocument();
  });

  it('renders the form fields and the two hosting cards', () => {
    renderConfig({ spec: SPEC, selectedIds: ['GET /a'], onGenerate: () => {} });
    expect(screen.getByDisplayValue('shopify')).toBeInTheDocument();
    // Base URL is auto-detected → shown as read-only text, not an input.
    expect(screen.getByText('https://api.shopify.com/v1')).toBeInTheDocument();
  });

  // RC1.2 — the transport question is replaced by the hosting question.
  it('shows the two hosting cards and drops the old transport cards', () => {
    renderConfig({ spec: SPEC, selectedIds: ['GET /a'], onGenerate: () => {} });
    expect(screen.getByRole('button', { name: /we host it for you/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /on my server/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /on my machine/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /on a remote/i })).not.toBeInTheDocument();
  });

  // RC1.3 — cloud pre-selected by default, label adapts when switching.
  it('pre-selects SLICE Cloud and adapts label when switching to self-host', async () => {
    renderConfig({ spec: SPEC, selectedIds: ['GET /a'], onGenerate: () => {} });
    expect(screen.getByRole('button', { name: /deploy to slice cloud/i })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: /on my server/i }));
    expect(screen.getByRole('button', { name: /download the kit/i })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: /we host it for you/i }));
    expect(screen.getByRole('button', { name: /deploy to slice cloud/i })).toBeEnabled();
  });

  // RC1.4 — the MCP server token field is gone from the UI.
  it('no longer exposes the MCP server token field', () => {
    renderConfig({ spec: SPEC, selectedIds: ['GET /a'], onGenerate: () => {} });
    expect(screen.queryByText(/mcp server token/i)).not.toBeInTheDocument();
  });

  it('disables the action when the form is invalid even after choosing hosting', async () => {
    renderConfig({ spec: SPEC, selectedIds: ['GET /a'], onGenerate: () => {} });
    await userEvent.click(screen.getByRole('button', { name: /we host it for you/i }));
    const name = screen.getByDisplayValue('shopify');
    await userEvent.clear(name);
    await userEvent.type(name, 'Bad Name');
    expect(screen.getByRole('button', { name: /deploy to slice cloud/i })).toBeDisabled();
  });

  it('calls onGenerate with the final config incl. hosting when the action is clicked', async () => {
    const onGenerate = vi.fn();
    renderConfig({ spec: SPEC, selectedIds: ['GET /a'], onGenerate });
    await userEvent.click(screen.getByRole('button', { name: /we host it for you/i }));
    await userEvent.click(screen.getByRole('button', { name: /deploy to slice cloud/i }));
    expect(onGenerate).toHaveBeenCalledOnce();
    const arg = onGenerate.mock.calls[0][0];
    expect(arg.mcpName).toBe('shopify');
    expect(arg.hosting).toBe('cloud');
    expect(arg.mode).toBe('remote');
    expect(arg.upstreamAuth.type).toBe('apiKey');
  });
});

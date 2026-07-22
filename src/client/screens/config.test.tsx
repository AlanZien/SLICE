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
    expect(screen.getByRole('button', { name: /we host it and relay/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /prefer to run it yourself/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /on my machine/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /on a remote/i })).not.toBeInTheDocument();
  });

  // RC1.3 — cloud pre-selected by default, label adapts when switching.
  it('pre-selects SLICE Cloud and adapts label when switching to self-host', async () => {
    renderConfig({ spec: SPEC, selectedIds: ['GET /a'], onGenerate: () => {} });
    expect(screen.getByRole('button', { name: /deploy to slice cloud/i })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: /prefer to run it yourself/i }));
    expect(screen.getByRole('button', { name: /download the kit/i })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: /we host it and relay/i }));
    expect(screen.getByRole('button', { name: /deploy to slice cloud/i })).toBeEnabled();
  });

  // RC1.4 — the MCP server token field is gone from the UI.
  it('no longer exposes the MCP server token field', () => {
    renderConfig({ spec: SPEC, selectedIds: ['GET /a'], onGenerate: () => {} });
    expect(screen.queryByText(/mcp server token/i)).not.toBeInTheDocument();
  });

  it('disables the action when the form is invalid even after choosing hosting', async () => {
    renderConfig({ spec: SPEC, selectedIds: ['GET /a'], onGenerate: () => {} });
    await userEvent.click(screen.getByRole('button', { name: /we host it and relay/i }));
    const name = screen.getByDisplayValue('shopify');
    await userEvent.clear(name);
    await userEvent.type(name, 'Bad Name');
    expect(screen.getByRole('button', { name: /deploy to slice cloud/i })).toBeDisabled();
  });

  it('calls onGenerate with the final config incl. hosting when the action is clicked', async () => {
    const onGenerate = vi.fn();
    renderConfig({ spec: SPEC, selectedIds: ['GET /a'], onGenerate });
    await userEvent.click(screen.getByRole('button', { name: /we host it and relay/i }));
    await userEvent.click(screen.getByRole('button', { name: /deploy to slice cloud/i }));
    expect(onGenerate).toHaveBeenCalledOnce();
    const arg = onGenerate.mock.calls[0][0];
    expect(arg.mcpName).toBe('shopify');
    expect(arg.hosting).toBe('cloud');
    expect(arg.mode).toBe('remote');
    expect(arg.upstreamAuth.type).toBe('apiKey');
  });
});

// ---------------------------------------------------------------------------
// GenerationReport (fail-loud)
// ---------------------------------------------------------------------------

function makeEndpoint(id: string, approximations?: string[]) {
  return {
    id,
    method: 'GET' as const,
    path: `/${id}`,
    label: id,
    params: [],
    ...(approximations && approximations.length > 0 ? { approximations } : {}),
  };
}

function specWithEndpoints(endpoints: ReturnType<typeof makeEndpoint>[]): ParsedSpec {
  return {
    ...SPEC,
    groups: [{ tag: 'All', endpoints: endpoints as ParsedSpec['groups'][0]['endpoints'] }],
  };
}

describe('<GenerationReport>', () => {
  // F1 — tous full → compteur visible, pas de lignes de détail
  it('F1: shows counter with "All fully supported" when all endpoints are full', () => {
    const spec = specWithEndpoints([makeEndpoint('a'), makeEndpoint('b')]);
    renderConfig({ spec, selectedIds: ['a', 'b'], onGenerate: () => {} });
    expect(screen.getByText(/2 \/ 2 endpoints in MCP/i)).toBeInTheDocument();
    expect(screen.getByText(/all fully supported/i)).toBeInTheDocument();
    expect(screen.queryByText(/approximated schema/i)).not.toBeInTheDocument();
  });

  // F2 — schema_fallback sélectionné → ligne ⚠ visible
  it('F2: shows schema_fallback detail line when a selected endpoint has schema_fallback', () => {
    const spec = specWithEndpoints([
      makeEndpoint('a'),
      makeEndpoint('b', ['schema_fallback']),
    ]);
    renderConfig({ spec, selectedIds: ['a', 'b'], onGenerate: () => {} });
    expect(screen.getByText(/approximated schema/i)).toBeInTheDocument();
    expect(screen.queryByText(/all fully supported/i)).not.toBeInTheDocument();
  });

  // F3 — counts corrects
  it('F3: counts are correct for mixed approximations', () => {
    const spec = specWithEndpoints([
      makeEndpoint('a'),
      makeEndpoint('b', ['schema_fallback']),
      makeEndpoint('c', ['non_json_body']),
    ]);
    renderConfig({ spec, selectedIds: ['a', 'b', 'c'], onGenerate: () => {} });
    expect(screen.getByText(/1 fully supported/i)).toBeInTheDocument();
    expect(screen.getByText(/1 with approximated schema/i)).toBeInTheDocument();
    expect(screen.getByText(/1 with no body support/i)).toBeInTheDocument();
  });

  // F4 — partial non sélectionné n'impacte pas le rapport
  it('F4: partial endpoint not in selectedIds does not affect report', () => {
    const spec = specWithEndpoints([
      makeEndpoint('a'),
      makeEndpoint('b', ['schema_fallback']),
    ]);
    renderConfig({ spec, selectedIds: ['a'], onGenerate: () => {} });
    expect(screen.getByText(/all fully supported/i)).toBeInTheDocument();
    expect(screen.queryByText(/approximated schema/i)).not.toBeInTheDocument();
  });

  // F5 — compteur N/N correct
  it('F5: counter shows correct selected count', () => {
    const spec = specWithEndpoints([makeEndpoint('a'), makeEndpoint('b'), makeEndpoint('c')]);
    renderConfig({ spec, selectedIds: ['a', 'b', 'c'], onGenerate: () => {} });
    expect(screen.getByText(/3 \/ 3 endpoints in MCP/i)).toBeInTheDocument();
  });
});

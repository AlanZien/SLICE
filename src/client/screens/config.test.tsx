import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ParsedSpec } from '@shared/types';
import { ConfigScreen } from './config';

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
    render(
      <ConfigScreen spec={SPEC} selectedIds={['GET /a']} onBack={() => {}} onGenerate={() => {}} />
    );
    // Pinned state: status block + "auto-detected" badge, no clickable
    // None/Bearer alternatives.
    expect(screen.getByRole('status', { name: /upstream authentication/i })).toBeInTheDocument();
    expect(screen.getByText(/auto-detected/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^bearer$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^none$/i })).not.toBeInTheDocument();
  });

  it('exposes the 3 auth options when the spec did not declare any', () => {
    render(
      <ConfigScreen spec={SPEC_NO_AUTH} selectedIds={['GET /a']} onBack={() => {}} onGenerate={() => {}} />
    );
    expect(screen.getByRole('button', { name: /none\s+public api/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /api key/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bearer/i })).toBeInTheDocument();
  });

  it('renders the form fields, the two hosting cards and the advanced toggle', () => {
    render(
      <ConfigScreen spec={SPEC} selectedIds={['GET /a']} onBack={() => {}} onGenerate={() => {}} />
    );
    expect(screen.getByDisplayValue('shopify')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://api.shopify.com/v1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /advanced options/i })).toBeInTheDocument();
  });

  // RC1.2 — the transport question is replaced by the hosting question.
  it('shows the two hosting cards and drops the old transport cards', () => {
    render(
      <ConfigScreen spec={SPEC} selectedIds={['GET /a']} onBack={() => {}} onGenerate={() => {}} />
    );
    expect(screen.getByRole('button', { name: /we host it for you/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /on my server/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /on my machine/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /on a remote/i })).not.toBeInTheDocument();
  });

  // RC1.3 — action disabled until a hosting target is picked, label adapts.
  it('keeps the action disabled until a hosting target is picked and adapts its label', async () => {
    render(
      <ConfigScreen spec={SPEC} selectedIds={['GET /a']} onBack={() => {}} onGenerate={() => {}} />
    );
    expect(
      screen.getByRole('button', { name: /deploy to slice cloud|download the kit/i })
    ).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /on my server/i }));
    expect(screen.getByRole('button', { name: /download the kit/i })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: /we host it for you/i }));
    expect(screen.getByRole('button', { name: /deploy to slice cloud/i })).toBeEnabled();
  });

  // RC1.4 — the MCP server token field is gone from the UI.
  it('no longer exposes the MCP server token field', async () => {
    render(
      <ConfigScreen spec={SPEC} selectedIds={['GET /a']} onBack={() => {}} onGenerate={() => {}} />
    );
    await userEvent.click(screen.getByRole('button', { name: /advanced options/i }));
    expect(screen.queryByText(/mcp server token/i)).not.toBeInTheDocument();
  });

  // RC1.5 — the detailed parameter descriptions toggle stays.
  it('still offers the detailed parameter descriptions toggle', async () => {
    render(
      <ConfigScreen spec={SPEC} selectedIds={['GET /a']} onBack={() => {}} onGenerate={() => {}} />
    );
    await userEvent.click(screen.getByRole('button', { name: /advanced options/i }));
    expect(screen.getByText(/detailed parameter descriptions/i)).toBeInTheDocument();
  });

  it('disables the action when the form is invalid even after choosing hosting', async () => {
    render(
      <ConfigScreen spec={SPEC} selectedIds={['GET /a']} onBack={() => {}} onGenerate={() => {}} />
    );
    await userEvent.click(screen.getByRole('button', { name: /we host it for you/i }));
    const name = screen.getByDisplayValue('shopify');
    await userEvent.clear(name);
    await userEvent.type(name, 'Bad Name');
    expect(screen.getByRole('button', { name: /deploy to slice cloud/i })).toBeDisabled();
  });

  it('calls onGenerate with the final config incl. hosting when the action is clicked', async () => {
    const onGenerate = vi.fn();
    render(
      <ConfigScreen spec={SPEC} selectedIds={['GET /a']} onBack={() => {}} onGenerate={onGenerate} />
    );
    await userEvent.click(screen.getByRole('button', { name: /we host it for you/i }));
    await userEvent.click(screen.getByRole('button', { name: /deploy to slice cloud/i }));
    expect(onGenerate).toHaveBeenCalledOnce();
    const arg = onGenerate.mock.calls[0][0];
    expect(arg.mcpName).toBe('shopify');
    expect(arg.hosting).toBe('cloud');
    expect(arg.mode).toBe('remote');
    expect(arg.upstreamAuth.type).toBe('apiKey');
  });

  it('Back triggers the onBack callback', async () => {
    const onBack = vi.fn();
    render(
      <ConfigScreen spec={SPEC} selectedIds={['GET /a']} onBack={onBack} onGenerate={() => {}} />
    );
    await userEvent.click(screen.getByRole('button', { name: /^back/i }));
    expect(onBack).toHaveBeenCalledOnce();
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
    render(<ConfigScreen spec={spec} selectedIds={['a', 'b']} onBack={() => {}} onGenerate={() => {}} />);
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
    render(<ConfigScreen spec={spec} selectedIds={['a', 'b']} onBack={() => {}} onGenerate={() => {}} />);
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
    render(<ConfigScreen spec={spec} selectedIds={['a', 'b', 'c']} onBack={() => {}} onGenerate={() => {}} />);
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
    render(<ConfigScreen spec={spec} selectedIds={['a']} onBack={() => {}} onGenerate={() => {}} />);
    expect(screen.getByText(/all fully supported/i)).toBeInTheDocument();
    expect(screen.queryByText(/approximated schema/i)).not.toBeInTheDocument();
  });

  // F5 — compteur N/N correct
  it('F5: counter shows correct selected count', () => {
    const spec = specWithEndpoints([makeEndpoint('a'), makeEndpoint('b'), makeEndpoint('c')]);
    render(<ConfigScreen spec={spec} selectedIds={['a', 'b', 'c']} onBack={() => {}} onGenerate={() => {}} />);
    expect(screen.getByText(/3 \/ 3 endpoints in MCP/i)).toBeInTheDocument();
  });
});

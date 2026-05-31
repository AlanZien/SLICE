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
    expect(screen.getByRole('button', { name: /slice cloud/i })).toBeInTheDocument();
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

    await userEvent.click(screen.getByRole('button', { name: /slice cloud/i }));
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
    await userEvent.click(screen.getByRole('button', { name: /slice cloud/i }));
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
    await userEvent.click(screen.getByRole('button', { name: /slice cloud/i }));
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

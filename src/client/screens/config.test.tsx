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

describe('<ConfigScreen> (phase 06)', () => {
  it('renders the form fields, dest cards, advanced toggle and generate button', () => {
    render(
      <ConfigScreen spec={SPEC} selectedIds={['GET /a']} onBack={() => {}} onGenerate={() => {}} />
    );
    expect(screen.getByDisplayValue('shopify')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://api.shopify.com/v1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /on my machine/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /on a remote/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /both/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /advanced options/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate my mcp/i })).toBeInTheDocument();
  });

  it('disables Generate when the form is invalid', async () => {
    render(
      <ConfigScreen spec={SPEC} selectedIds={['GET /a']} onBack={() => {}} onGenerate={() => {}} />
    );
    const name = screen.getByDisplayValue('shopify');
    await userEvent.clear(name);
    await userEvent.type(name, 'Bad Name');
    expect(screen.getByRole('button', { name: /generate my mcp/i })).toBeDisabled();
  });

  it('calls onGenerate with the final config when Generate is clicked', async () => {
    const onGenerate = vi.fn();
    render(
      <ConfigScreen spec={SPEC} selectedIds={['GET /a']} onBack={() => {}} onGenerate={onGenerate} />
    );
    await userEvent.click(screen.getByRole('button', { name: /generate my mcp/i }));
    expect(onGenerate).toHaveBeenCalledOnce();
    const arg = onGenerate.mock.calls[0][0];
    expect(arg.mcpName).toBe('shopify');
    expect(arg.mode).toBe('both');
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

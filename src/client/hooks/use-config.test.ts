import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { DefaultConfig } from '@shared/types';
import { useConfig } from './use-config';

const baseDefault: DefaultConfig = {
  mcpName: 'shopify-admin',
  baseUrl: 'https://api.shopify.com/v1',
  upstreamAuth: { type: 'apiKey', headerName: 'X-API-Key' },
  mcpServerToken: 'a'.repeat(32),
};

describe('useConfig', () => {
  it('initialises from defaultConfig and exposes safe defaults', () => {
    const { result } = renderHook(() => useConfig(baseDefault));
    expect(result.current.config.mcpName).toBe('shopify-admin');
    expect(result.current.config.baseUrl).toBe('https://api.shopify.com/v1');
    expect(result.current.config.mode).toBe('both'); // SPEC R1.3.2 — both is the recommended default
    expect(result.current.config.includeParamDescriptions).toBe(true);
    expect(result.current.config.retryOnServerError).toBe(false);
    expect(result.current.isValid).toBe(true);
  });

  it('setField updates a single value', () => {
    const { result } = renderHook(() => useConfig(baseDefault));
    act(() => result.current.setField('mcpName', 'github-mcp'));
    expect(result.current.config.mcpName).toBe('github-mcp');
  });

  it('flags an invalid mcpName via the errors map', () => {
    const { result } = renderHook(() => useConfig(baseDefault));
    act(() => result.current.setField('mcpName', 'Bad Name!'));
    expect(result.current.errors.mcpName).toBeTruthy();
    expect(result.current.isValid).toBe(false);
  });

  it('flags an invalid baseUrl via the errors map', () => {
    const { result } = renderHook(() => useConfig(baseDefault));
    act(() => result.current.setField('baseUrl', 'not-a-url'));
    expect(result.current.errors.baseUrl).toBeTruthy();
    expect(result.current.isValid).toBe(false);
  });

  it('switches mode and re-validates the mcpServerToken requirement', () => {
    const noToken = { ...baseDefault, mcpServerToken: '' };
    const { result } = renderHook(() => useConfig(noToken));
    act(() => result.current.setField('mode', 'remote'));
    // Empty token + remote mode → invalid.
    expect(result.current.isValid).toBe(false);
    act(() => result.current.setField('mode', 'local'));
    // Local mode doesn't need the token.
    expect(result.current.isValid).toBe(true);
  });

  it('setUpstreamAuth lets the user toggle the auth type cleanly', () => {
    const { result } = renderHook(() => useConfig(baseDefault));
    act(() => result.current.setUpstreamAuth({ type: 'bearer' }));
    expect(result.current.config.upstreamAuth.type).toBe('bearer');
    expect((result.current.config.upstreamAuth as { headerName?: string }).headerName).toBeUndefined();
  });

  it('setUpstreamAuth requires headerName when switching to apiKey', () => {
    const { result } = renderHook(() => useConfig(baseDefault));
    act(() => result.current.setUpstreamAuth({ type: 'apiKey', headerName: '' }));
    expect(result.current.errors.upstreamAuth).toBeTruthy();
  });
});

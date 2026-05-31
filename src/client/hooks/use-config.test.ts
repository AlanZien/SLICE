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
    // Pivot — transport pinned to remote, hosting not chosen yet (RC1.3).
    expect(result.current.config.mode).toBe('remote');
    expect(result.current.config.hosting).toBeUndefined();
    expect(result.current.config.includeParamDescriptions).toBe(true);
    expect(result.current.config.retryOnServerError).toBe(false);
    // Invalid until a hosting target is picked.
    expect(result.current.isValid).toBe(false);
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

  it('becomes valid once a hosting target is chosen (RC1.3)', () => {
    const { result } = renderHook(() => useConfig(baseDefault));
    // No hosting picked → invalid, whatever else is filled in.
    expect(result.current.isValid).toBe(false);
    act(() => result.current.setField('hosting', 'cloud'));
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

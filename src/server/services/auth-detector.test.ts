import { describe, it, expect } from 'vitest';
import { detectAuth } from './auth-detector';

describe('detectAuth', () => {
  it('returns { type: "none" } when no securitySchemes are declared', () => {
    expect(detectAuth(undefined)).toEqual({ type: 'none' });
    expect(detectAuth({})).toEqual({ type: 'none' });
    expect(detectAuth(null)).toEqual({ type: 'none' });
  });

  it('detects apiKey schemes and exposes the header name', () => {
    const result = detectAuth({
      ApiKey: { type: 'apiKey', name: 'X-Shopify-Access-Token', in: 'header' },
    });
    expect(result).toEqual({ type: 'apiKey', headerName: 'X-Shopify-Access-Token' });
  });

  it('detects http+bearer schemes', () => {
    const result = detectAuth({
      Bearer: { type: 'http', scheme: 'bearer' },
    });
    expect(result).toEqual({ type: 'bearer' });
  });

  it('is case-insensitive on the http scheme value (Swashbuckle compat)', () => {
    expect(detectAuth({ B: { type: 'http', scheme: 'Bearer' } })).toEqual({ type: 'bearer' });
    expect(detectAuth({ B: { type: 'http', scheme: 'BEARER' } })).toEqual({ type: 'bearer' });
  });

  it('prefers bearer over apiKey when both are present (more capable)', () => {
    const result = detectAuth({
      ApiKey: { type: 'apiKey', name: 'X-API-Key', in: 'header' },
      Bearer: { type: 'http', scheme: 'bearer' },
    });
    expect(result.type).toBe('bearer');
  });

  it('prefers query-located apiKey only after header-located apiKey is tried', () => {
    const result = detectAuth({
      QueryKey: { type: 'apiKey', name: 'api_key', in: 'query' },
      HeaderKey: { type: 'apiKey', name: 'X-API-Key', in: 'header' },
    });
    // Header-located is preferred (safer than logged-in-URL query params).
    expect(result).toEqual({ type: 'apiKey', headerName: 'X-API-Key' });
  });

  // --- OAuth2 (phase OAuth-1a) ---

  it('detects oauth2 client_credentials → { type:"oauth2", tokenUrl, scopes } (R1)', () => {
    const result = detectAuth({
      OAuth2: {
        type: 'oauth2',
        flows: {
          clientCredentials: {
            tokenUrl: 'https://api.example.com/oauth/token',
            scopes: { read: 'Read', write: 'Write' },
          },
        },
      },
    });
    expect(result).toEqual({
      type: 'oauth2',
      tokenUrl: 'https://api.example.com/oauth/token',
      scopes: ['read', 'write'],
    });
  });

  it('resolves a relative clientCredentials tokenUrl against baseUrl (R2)', () => {
    const result = detectAuth(
      { OAuth2: { type: 'oauth2', flows: { clientCredentials: { tokenUrl: '/oauth/token', scopes: {} } } } },
      { baseUrl: 'https://api.example.com/v1' }
    );
    expect(result).toEqual({ type: 'oauth2', tokenUrl: 'https://api.example.com/oauth/token', scopes: [] });
  });

  it('falls back to bearer when clientCredentials has no tokenUrl (R5)', () => {
    const result = detectAuth({
      OAuth2: { type: 'oauth2', flows: { clientCredentials: { scopes: {} } } },
    });
    expect(result).toEqual({ type: 'bearer' });
  });

  it('maps oauth2 without clientCredentials (authorizationCode) to bearer (R3)', () => {
    const result = detectAuth({
      OAuth2: {
        type: 'oauth2',
        flows: { authorizationCode: { authorizationUrl: 'https://a/auth', tokenUrl: 'https://a/tok', scopes: {} } },
      },
    });
    expect(result).toEqual({ type: 'bearer' });
  });

  it('maps openIdConnect to bearer (R4)', () => {
    const result = detectAuth({
      OIDC: { type: 'openIdConnect', openIdConnectUrl: 'https://a/.well-known/openid-configuration' },
    });
    expect(result).toEqual({ type: 'bearer' });
  });

  it('prefers oauth2 client_credentials over bearer when both are referenced (R7)', () => {
    const result = detectAuth({
      Bearer: { type: 'http', scheme: 'bearer' },
      OAuth2: { type: 'oauth2', flows: { clientCredentials: { tokenUrl: 'https://a/tok', scopes: {} } } },
    });
    expect(result.type).toBe('oauth2');
  });

  it('only considers referenced schemes when a referenced set is given (R7bis)', () => {
    // OAuth2 is declared but NOT referenced; only Bearer is used by endpoints.
    const result = detectAuth(
      {
        Bearer: { type: 'http', scheme: 'bearer' },
        OAuth2: { type: 'oauth2', flows: { clientCredentials: { tokenUrl: 'https://a/tok', scopes: {} } } },
      },
      { referenced: new Set(['Bearer']) }
    );
    expect(result).toEqual({ type: 'bearer' });
  });

  it('falls back to all declared schemes when no scheme is referenced (empty set)', () => {
    // A spec that declares apiKey but no endpoint/root `security` → empty
    // referenced set → we still detect the declared scheme (not "none").
    const result = detectAuth(
      { ApiKey: { type: 'apiKey', name: 'X-API-Key', in: 'header' } },
      { referenced: new Set() }
    );
    expect(result).toEqual({ type: 'apiKey', headerName: 'X-API-Key' });
  });

  it('ignores schemes that are not real objects', () => {
    const result = detectAuth({
      Bogus: null,
      Other: 'not-an-object',
      Bearer: { type: 'http', scheme: 'bearer' },
    } as unknown as Record<string, unknown>);
    expect(result.type).toBe('bearer');
  });
});

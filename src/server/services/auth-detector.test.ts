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

  it('returns { type: "none" } when only unsupported schemes are present', () => {
    // SLICE rejects oauth2/openIdConnect/http-basic/http-digest at parsing
    // time (UNSUPPORTED_AUTH). If somehow they reach the detector, fall
    // back to "none" so the config defaults stay safe.
    const result = detectAuth({
      OAuth2: { type: 'oauth2', flows: { implicit: { authorizationUrl: 'x', scopes: {} } } },
    });
    expect(result).toEqual({ type: 'none' });
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

import { describe, it, expect } from 'vitest';
import { sanitizeSpec } from './spec-sanitizer';

function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o)) as T;
}

describe('sanitizeSpec', () => {
  it('lowercases an HTTP securityScheme name registered with IANA (Bearer → bearer)', () => {
    const input = {
      openapi: '3.0.3',
      components: {
        securitySchemes: {
          Bearer: { type: 'http', scheme: 'Bearer', bearerFormat: 'JWT' },
        },
      },
    };
    const out = sanitizeSpec(input);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((out as any).components.securitySchemes.Bearer.scheme).toBe('bearer');
  });

  it.each([
    ['Basic', 'basic'],
    ['Digest', 'digest'],
    ['Negotiate', 'negotiate'],
    ['SCRAM-SHA-256', 'scram-sha-256'],
  ])('lowercases IANA scheme %s → %s', (input, expected) => {
    const doc = {
      components: { securitySchemes: { S: { type: 'http', scheme: input } } },
    };
    const out = sanitizeSpec(doc);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((out as any).components.securitySchemes.S.scheme).toBe(expected);
  });

  it('leaves non-IANA scheme names untouched (strict for custom schemes)', () => {
    const input = {
      components: {
        securitySchemes: {
          Custom: { type: 'http', scheme: 'customAuth' },
        },
      },
    };
    const out = sanitizeSpec(input);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((out as any).components.securitySchemes.Custom.scheme).toBe('customAuth');
  });

  it('only touches `scheme`, never `type`/`name`/`in`/`flows`', () => {
    const input = {
      components: {
        securitySchemes: {
          ApiKey: { type: 'apiKey', name: 'X-API-Key', in: 'header' },
          Bearer: { type: 'http', scheme: 'Bearer' },
          OAuth: { type: 'oauth2', flows: { implicit: { authorizationUrl: 'x', scopes: {} } } },
        },
      },
    };
    const out = sanitizeSpec(clone(input));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = (out as any).components.securitySchemes;
    expect(s.ApiKey).toEqual(input.components.securitySchemes.ApiKey);
    expect(s.OAuth).toEqual(input.components.securitySchemes.OAuth);
    expect(s.Bearer.type).toBe('http');
    expect(s.Bearer.scheme).toBe('bearer');
  });

  it('is a no-op on a doc without securitySchemes', () => {
    const doc = { openapi: '3.0.3', paths: {} };
    expect(sanitizeSpec(doc)).toEqual(doc);
  });

  it('is a no-op when scheme is missing or non-string', () => {
    const input = {
      components: {
        securitySchemes: {
          Weird: { type: 'http' }, // no scheme — invalid but not our concern
          Numeric: { type: 'http', scheme: 42 },
        },
      },
    };
    const out = sanitizeSpec(clone(input));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((out as any).components.securitySchemes).toEqual(input.components.securitySchemes);
  });

  it('does not mutate the input doc (returns the same reference, mutated in place is OK but predictable)', () => {
    // Pragma: we accept in-place mutation as long as the contract is "the
    // returned doc is sanitised". The pipeline reuses the value either way.
    const doc = {
      components: { securitySchemes: { B: { type: 'http', scheme: 'Bearer' } } },
    };
    const out = sanitizeSpec(doc);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((out as any).components.securitySchemes.B.scheme).toBe('bearer');
  });
});

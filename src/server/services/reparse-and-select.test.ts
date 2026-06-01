// T1 — reparse-and-select must PRESERVE PARSE_TOO_COMPLEX / PARSE_TIMEOUT
// instead of flattening every ParseError into a generic INVALID_SPEC 400.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError, ParseError } from '@shared/types';

const parseSpec = vi.fn();
vi.mock('./parser', () => ({ parseSpec: (...a: unknown[]) => parseSpec(...a) }));

import { reparseAndSelect } from './reparse-and-select';

describe('reparseAndSelect — error code preservation', () => {
  beforeEach(() => parseSpec.mockReset());

  it('preserves PARSE_TOO_COMPLEX as a 422 ApiError', async () => {
    parseSpec.mockRejectedValueOnce(new ParseError('PARSE_TOO_COMPLEX', 'too complex'));
    await expect(reparseAndSelect('raw', ['GET /x'], 'host')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'PARSE_TOO_COMPLEX',
      status: 422,
    });
  });

  it('still flattens other parse errors to INVALID_SPEC 400', async () => {
    parseSpec.mockRejectedValueOnce(new ParseError('INVALID_SPEC', 'bad'));
    await expect(reparseAndSelect('raw', ['GET /x'], 'host')).rejects.toMatchObject({
      code: 'INVALID_SPEC',
      status: 400,
    });
  });

  it('maps PARSE_TIMEOUT to a 504', async () => {
    parseSpec.mockRejectedValueOnce(new ParseError('PARSE_TIMEOUT', 'slow'));
    await expect(reparseAndSelect('raw', ['GET /x'], 'host')).rejects.toMatchObject({
      status: 504,
    });
  });

  it('is an ApiError instance (so routes map it)', async () => {
    parseSpec.mockRejectedValueOnce(new ParseError('PARSE_TOO_COMPLEX', 'x'));
    await expect(reparseAndSelect('raw', ['a'], 'generate')).rejects.toBeInstanceOf(ApiError);
  });
});

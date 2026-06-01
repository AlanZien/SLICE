/**
 * Shared by `POST /api/generate` and `POST /api/host`: re-parse the raw spec
 * server-side (R1.4.1bis — never trust the client-side parse) and whitelist
 * `selectedIds` against the freshly-parsed endpoints. Keeping this in one place
 * means the "never trust the client parse" guard can't drift between the two
 * routes. `logPrefix` tags the server-side warning so a failure stays
 * attributable to the calling route.
 */
import { parseSpec } from './parser';
import { ApiError, ParseError, type Endpoint, type ParsedSpec } from '@shared/types';

export interface ReparsedSelection {
  reparsed: ParsedSpec;
  validIds: string[];
}

export async function reparseAndSelect(
  rawSpec: string,
  selectedIds: string[],
  logPrefix: string
): Promise<ReparsedSelection> {
  let reparsed: ParsedSpec;
  try {
    reparsed = await parseSpec(rawSpec, { sizeBytes: Buffer.byteLength(rawSpec) });
  } catch (err) {
    // Log the underlying cause server-side; the client sees a stable generic
    // message so we don't leak parser internals.
    // eslint-disable-next-line no-console
    console.warn(`[${logPrefix}] re-parse failed:`, err instanceof Error ? err.message : err);
    // Preserve the codes that carry a distinct, actionable meaning (anti-DoS,
    // D004) instead of flattening them into a generic INVALID_SPEC.
    if (err instanceof ParseError && err.code === 'PARSE_TOO_COMPLEX') {
      throw new ApiError(
        'PARSE_TOO_COMPLEX',
        'This API description is too complex to process (too many nested references).',
        422
      );
    }
    if (err instanceof ParseError && err.code === 'PARSE_TIMEOUT') {
      throw new ApiError('TIMEOUT', 'Parsing the spec timed out.', 504);
    }
    throw new ApiError('INVALID_SPEC', 'Failed to re-parse the spec.', 400);
  }

  const knownIds = new Set(
    reparsed.groups.flatMap((g) => g.endpoints.map((e: Endpoint) => e.id))
  );
  const validIds = selectedIds.filter((id) => knownIds.has(id));
  if (validIds.length === 0) {
    throw new ApiError(
      'NO_ENDPOINT_SELECTED',
      'None of the selected endpoints were found in the parsed spec.',
      400
    );
  }

  return { reparsed, validIds };
}

import type { UpstreamAuthType } from '@shared/types';

export interface DetectedAuth {
  type: UpstreamAuthType;
  /** Only set for `apiKey` — name of the header to forward. */
  headerName?: string;
}

/**
 * Decide which upstream auth scheme the generated MCP should use.
 *
 * Priority (from most capable / safest to least):
 *   1. http + bearer    (a single Authorization header, no extra metadata)
 *   2. apiKey in header (clean, doesn't leak in URLs)
 *   3. apiKey in query  (works but discouraged — defaulted to last)
 *
 * Anything else — oauth2, openIdConnect, http+basic, http+digest — is
 * already rejected upstream by `assertSupportedAuth` in the parser. If a
 * malformed scheme manages to reach this detector, we conservatively fall
 * back to `{ type: "none" }` rather than guess.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function detectAuth(
  schemes: Record<string, any> | null | undefined
): DetectedAuth {
  if (!schemes || typeof schemes !== 'object') return { type: 'none' };

  let headerApiKey: string | null = null;
  let queryApiKey: string | null = null;
  let hasBearer = false;

  for (const scheme of Object.values(schemes)) {
    if (!scheme || typeof scheme !== 'object') continue;
    const type = String((scheme as any).type ?? '').toLowerCase();
    if (type === 'http') {
      const sub = String((scheme as any).scheme ?? '').toLowerCase();
      if (sub === 'bearer') hasBearer = true;
      continue;
    }
    if (type === 'apikey') {
      const where = String((scheme as any).in ?? '').toLowerCase();
      const name = typeof (scheme as any).name === 'string' ? (scheme as any).name : null;
      if (!name) continue;
      if (where === 'header' && !headerApiKey) headerApiKey = name;
      else if (where === 'query' && !queryApiKey) queryApiKey = name;
    }
  }

  if (hasBearer) return { type: 'bearer' };
  if (headerApiKey) return { type: 'apiKey', headerName: headerApiKey };
  if (queryApiKey) return { type: 'apiKey', headerName: queryApiKey };
  return { type: 'none' };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

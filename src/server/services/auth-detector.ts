import type { UpstreamAuthType } from '@shared/types';

export interface DetectedAuth {
  type: UpstreamAuthType;
  /** Only set for `apiKey` — name of the header to forward. */
  headerName?: string;
  /** Only set for `oauth2` — absolute https token endpoint (client_credentials). */
  tokenUrl?: string;
  /** Only set for `oauth2` — scopes to request at the token endpoint. */
  scopes?: string[];
}

export interface DetectAuthOptions {
  /**
   * When provided AND non-empty, only schemes whose name is in this set are
   * considered — mirrors the parser's "referenced schemes" pass so a
   * declared-but-unused scheme can't be imposed. An empty set (no endpoint
   * declares any `security`) means "no explicit requirement": we fall back to
   * every declared scheme rather than detect nothing.
   */
  referenced?: Set<string>;
  /** Base URL used to resolve a relative OAuth2 `tokenUrl` to an absolute one. */
  baseUrl?: string;
}

/**
 * Decide which upstream auth scheme the generated MCP should use.
 *
 * Priority (from most capable / safest to least):
 *   1. oauth2 client_credentials (the MCP fetches its own bearer token)
 *   2. http + bearer    (a single Authorization header, no extra metadata)
 *   3. apiKey in header (clean, doesn't leak in URLs)
 *   4. apiKey in query  (works but discouraged — defaulted to last)
 *
 * OAuth2 flows other than client_credentials, and openIdConnect, collapse to
 * `bearer` — at runtime they all carry an `Authorization: Bearer <token>`, so
 * the relay/env bearer machinery covers them. http+basic/digest aren't
 * handled here (rejected by `assertSupportedAuth`); a stray one falls back to
 * `{ type: "none" }` rather than guess.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function detectAuth(
  schemes: Record<string, any> | null | undefined,
  opts: DetectAuthOptions = {}
): DetectedAuth {
  if (!schemes || typeof schemes !== 'object') return { type: 'none' };

  let oauth2: DetectedAuth | null = null;
  let headerApiKey: string | null = null;
  let queryApiKey: string | null = null;
  let hasBearer = false;

  const filter = opts.referenced && opts.referenced.size > 0 ? opts.referenced : null;
  for (const [name, scheme] of Object.entries(schemes)) {
    if (filter && !filter.has(name)) continue;
    if (!scheme || typeof scheme !== 'object') continue;
    const type = String((scheme as any).type ?? '').toLowerCase();

    if (type === 'oauth2') {
      const detected = oauth2FromScheme(scheme, opts.baseUrl);
      if (detected.type === 'oauth2' && !oauth2) oauth2 = detected;
      else if (detected.type === 'bearer') hasBearer = true; // non-cc flow → bearer
      continue;
    }
    if (type === 'openidconnect') {
      hasBearer = true; // OIDC tokens are bearer at the wire
      continue;
    }
    if (type === 'http') {
      const sub = String((scheme as any).scheme ?? '').toLowerCase();
      if (sub === 'bearer') hasBearer = true;
      continue;
    }
    if (type === 'apikey') {
      const where = String((scheme as any).in ?? '').toLowerCase();
      const keyName = typeof (scheme as any).name === 'string' ? (scheme as any).name : null;
      if (!keyName) continue;
      if (where === 'header' && !headerApiKey) headerApiKey = keyName;
      else if (where === 'query' && !queryApiKey) queryApiKey = keyName;
    }
  }

  if (oauth2) return oauth2;
  if (hasBearer) return { type: 'bearer' };
  if (headerApiKey) return { type: 'apiKey', headerName: headerApiKey };
  if (queryApiKey) return { type: 'apiKey', headerName: queryApiKey };
  return { type: 'none' };
}

/**
 * Collect every securityScheme NAME actually required by an endpoint — the
 * OpenAPI security model is an array of requirement objects whose keys
 * reference scheme names. A root-level `security` is the default; an
 * operation-level `security` (including `[]`) overrides it. Shared by the
 * parser's `assertSupportedAuth` and the normalizer's `detectAuth` so both
 * passes agree on which schemes count.
 */
export function collectReferencedSchemeNames(doc: any): Set<string> {
  const referenced = new Set<string>();
  const add = (security: any) => {
    if (!Array.isArray(security)) return;
    for (const item of security) {
      if (item && typeof item === 'object') for (const name of Object.keys(item)) referenced.add(name);
    }
  };

  add(doc?.security);
  const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];
  for (const pathItem of Object.values(doc?.paths ?? {})) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    for (const method of HTTP_METHODS) {
      const op = (pathItem as any)[method];
      if (op && typeof op === 'object' && Array.isArray(op.security)) add(op.security);
    }
  }
  return referenced;
}

/**
 * Map one `type: oauth2` scheme to a DetectedAuth. A usable client_credentials
 * flow (with a resolvable tokenUrl) becomes `oauth2`; anything else (other
 * flows, or client_credentials missing its tokenUrl) collapses to `bearer`.
 */
function oauth2FromScheme(scheme: any, baseUrl?: string): DetectedAuth {
  const cc = scheme?.flows?.clientCredentials;
  const rawTokenUrl = typeof cc?.tokenUrl === 'string' ? cc.tokenUrl.trim() : '';
  if (!rawTokenUrl) return { type: 'bearer' };

  let tokenUrl: string;
  try {
    tokenUrl = baseUrl ? new URL(rawTokenUrl, baseUrl).href : new URL(rawTokenUrl).href;
  } catch {
    return { type: 'bearer' }; // relative tokenUrl with no resolvable base
  }

  const scopes = cc.scopes && typeof cc.scopes === 'object' ? Object.keys(cc.scopes) : [];
  return { type: 'oauth2', tokenUrl, scopes };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

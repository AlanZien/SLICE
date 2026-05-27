/**
 * Spec sanitizer — applies a narrow set of *non-semantic* normalisations to
 * a parsed OpenAPI 3 document before it reaches `SwaggerParser.validate`.
 *
 * Why this exists (and what it is NOT):
 * - It is NOT a general "make-broken-specs-work" layer. SLICE's "faithful
 *   translator" principle (SPEC §0) explicitly forbids rewriting semantics.
 * - It IS an orthographic alignment on a closed set of IANA-registered
 *   constants. The OpenAPI 3 schema says `securityScheme.scheme` (when
 *   `type: http`) must be one of the HTTP Authentication Schemes registered
 *   with IANA (RFC 7235 §5.1) — and those names are defined in lowercase.
 *
 *   In practice many generators (notably Swashbuckle/.NET) emit
 *   `scheme: Bearer` because the canonical *header value* is `Authorization:
 *   Bearer <token>`. The SwaggerParser validator rejects this with a wall of
 *   schema errors that's borderline unusable. We accept the bug-compatible
 *   variants and rewrite them to canonical lowercase. No other field is
 *   touched, custom (non-IANA) scheme names are left alone — they will be
 *   rejected by the validator as before, which is the correct behaviour.
 *
 * Tracked in RETRO after EVALUATE phase 03.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// IANA-registered HTTP Authentication Schemes (RFC 7235 §5.1) — list as of
// 2026-05. New entries are extremely rare; keep this list explicit so we
// never normalise something we don't intend to.
const IANA_HTTP_SCHEMES = new Set([
  'basic',
  'bearer',
  'concealed',
  'digest',
  'dpop',
  'gnap',
  'hoba',
  'mutual',
  'negotiate',
  'oauth',
  'privatetoken',
  'scram-sha-1',
  'scram-sha-256',
  'vapid',
]);

export function sanitizeSpec(doc: unknown): unknown {
  if (!doc || typeof doc !== 'object') return doc;
  const schemes = (doc as any)?.components?.securitySchemes;
  if (!schemes || typeof schemes !== 'object') return doc;

  for (const value of Object.values(schemes as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const s = value as Record<string, unknown>;
    if (s.type !== 'http') continue;
    if (typeof s.scheme !== 'string') continue;

    const lower = s.scheme.toLowerCase();
    if (IANA_HTTP_SCHEMES.has(lower) && lower !== s.scheme) {
      s.scheme = lower;
    }
  }

  return doc;
}

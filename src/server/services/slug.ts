import { createHash } from 'node:crypto';

/**
 * Convert an API title into a safe MCP server name.
 *
 * Output guarantees:
 *   - Lowercase ASCII only: `[a-z0-9-]`.
 *   - Length in `[3, 40]` (so it fits in npm-style names and CLI flags).
 *   - Never empty.
 *
 * Fallbacks:
 *   1. Strip diacritics, drop everything outside `[a-z0-9-]`, collapse runs
 *      of dashes/whitespace.
 *   2. If the result is shorter than 3 chars but non-empty, append `-mcp`.
 *   3. If the input has no alphanumeric content at all, return
 *      `mcp-server-<hash4>` where `<hash4>` is a stable hex prefix of the
 *      input. Stable hash keeps the same garbled input → the same fallback,
 *      which is convenient for tests and predictable for users.
 */
export function slugify(input: string): string {
  const trimmed = (input ?? '').trim();
  if (trimmed.length === 0) return fallbackHash(input ?? '');

  // NFD splits accented characters into base + combining mark; the regex
  // then strips the combining marks via the unicode diacritic property.
  const ascii = trimmed
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

  // Replace anything that's not a-z, 0-9 or '-' with a dash, then collapse
  // runs of dashes and trim them at the edges.
  const dashed = ascii
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (dashed.length === 0) return fallbackHash(input);

  const capped = dashed.slice(0, 40).replace(/-+$/g, '');

  if (capped.length < 3) {
    // Pad short slugs so they fit the 3-char minimum without colliding with
    // the empty-input fallback's "mcp-server-" prefix.
    return `${capped}-mcp`.slice(0, 40);
  }

  return capped;
}

function fallbackHash(input: string): string {
  const hash = createHash('sha1').update(input).digest('hex').slice(0, 4);
  return `mcp-server-${hash}`;
}

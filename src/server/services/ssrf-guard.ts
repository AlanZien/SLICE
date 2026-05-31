/**
 * SSRF guard for the hosted runtime.
 *
 * The hosted MCP (`/m/:id`) issues outbound `fetch`es to a user-supplied
 * `baseUrl` from SLICE's own network position and returns the body to the
 * caller. Without a guard this is a textbook SSRF / open-proxy primitive: an
 * (anonymous) caller could point `baseUrl` at `169.254.169.254` (cloud
 * metadata), `127.0.0.1`, or any internal service and read the response.
 *
 * `assertPublicUrl` rejects URLs whose host resolves to a loopback, private
 * (RFC1918), link-local, or unique-local address. It is enforced twice:
 * once at config-creation time (`POST /api/host`, fail fast) and once at
 * request time (defense in depth).
 *
 * Residual risk (tracked for hardening): a hostname that passes the check at
 * creation but is re-pointed at a private IP before the request (DNS
 * rebinding). Full protection requires pinning the resolved IP for the
 * connection via a custom dispatcher — out of scope for this MVP tranche.
 */
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfError';
  }
}

/** Throws SsrfError unless `rawUrl` is an http(s) URL pointing at a public host. */
export async function assertPublicUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfError(`Not a valid URL: ${rawUrl}`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SsrfError(`Only http(s) URLs are allowed, got: ${url.protocol}`);
  }

  // Strip the brackets IPv6 literals carry in a URL host.
  const host = url.hostname.replace(/^\[|\]$/g, '');

  const literalFamily = isIP(host);
  if (literalFamily !== 0) {
    assertPublicAddress(host);
    return;
  }

  // Hostname — resolve every address it maps to and reject if any is private.
  let resolved: Array<{ address: string }>;
  try {
    resolved = await lookup(host, { all: true });
  } catch {
    throw new SsrfError(`Could not resolve host: ${host}`);
  }
  if (resolved.length === 0) {
    throw new SsrfError(`Host did not resolve to any address: ${host}`);
  }
  for (const { address } of resolved) {
    assertPublicAddress(address);
  }
}

/** Throws SsrfError if `ip` is a loopback/private/link-local/unique-local address. */
function assertPublicAddress(ip: string): void {
  const family = isIP(ip);
  if (family === 4) {
    if (isPrivateV4(ip)) throw new SsrfError(`Blocked non-public address: ${ip}`);
    return;
  }
  if (family === 6) {
    // IPv4-mapped (::ffff:a.b.c.d, normalised to ::ffff:HHHH:HHHH by the URL
    // parser) — judge by the embedded v4 address.
    const mappedV4 = embeddedV4(ip);
    if (mappedV4) {
      assertPublicAddress(mappedV4);
      return;
    }
    if (isPrivateV6(ip)) throw new SsrfError(`Blocked non-public address: ${ip}`);
    return;
  }
  throw new SsrfError(`Not an IP address: ${ip}`);
}

function isPrivateV4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true; // malformed → treat as unsafe
  }
  const [a, b] = parts as [number, number, number, number];
  if (a === 0) return true; // 0.0.0.0/8 "this host"
  if (a === 127) return true; // loopback
  if (a === 10) return true; // RFC1918
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 168) return true; // RFC1918
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

/**
 * Extract the embedded IPv4 of an `::ffff:…` mapped address, in either the
 * dotted form (`::ffff:127.0.0.1`) or the hex form the URL parser normalises
 * to (`::ffff:7f00:1`). Returns the dotted v4 string, or null if not mapped.
 */
function embeddedV4(ip: string): string | null {
  const lower = ip.toLowerCase();
  if (!lower.startsWith('::ffff:')) return null;
  const tail = lower.slice('::ffff:'.length);
  if (tail.includes('.')) return tail; // already dotted
  const groups = tail.split(':');
  if (groups.length !== 2) return null;
  const hi = parseInt(groups[0]!, 16);
  const lo = parseInt(groups[1]!, 16);
  if (Number.isNaN(hi) || Number.isNaN(lo)) return null;
  return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
}

function isPrivateV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true; // loopback / unspecified
  if (lower.startsWith('fe80')) return true; // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique-local fc00::/7
  return false;
}

import { randomBytes } from 'node:crypto';

/**
 * Produce a 32-character lowercase hex string suitable for the
 * `MCP_SERVER_TOKEN` env var the generated MCP will look for.
 *
 * 16 bytes (128 bits) of entropy is plenty for an internal Bearer token
 * the user keeps in their `.env` — not a password, not a long-lived secret
 * for a multi-tenant service.
 */
export function generateMcpServerToken(): string {
  return randomBytes(16).toString('hex');
}

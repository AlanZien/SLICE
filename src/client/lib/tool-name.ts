import type { Endpoint } from '@shared/types';

/**
 * Human-facing preview of the MCP tool name derived from an endpoint
 * (`get_pet.findByStatus`). Mirrors the generator's naming so the user can
 * recognise the tool their agent will see. Shared by the endpoint rows and
 * the preview pane.
 */
export function toolNameFor(endpoint: Endpoint): string {
  const path = endpoint.path
    .replace(/^\/+/, '')
    .replace(/\{(\w+)\}/g, ':$1')
    .replace(/[^a-zA-Z0-9_/:.-]/g, '_')
    .replace(/\/+/g, '.')
    .replace(/:/g, '');
  return `${endpoint.method.toLowerCase()}_${path || 'root'}`;
}

/**
 * Display form of a tool name for tight spots (endpoint rows): long names are
 * truncated from the HEAD so the tail — the part that tells two siblings
 * apart (`…external_accounts.id` vs `…external_accounts`) — stays visible.
 * The full name belongs in a `title` tooltip next to this.
 */
export function displayToolName(name: string, maxChars = 38): string {
  if (name.length <= maxChars) return name;
  // Strip the separator left dangling at the cut so the ellipsis is followed
  // by a clean segment (`…accounts.id`, not `….accounts.id`).
  return `…${name.slice(name.length - maxChars).replace(/^[._]+/, '')}`;
}

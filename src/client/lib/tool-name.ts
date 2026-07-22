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

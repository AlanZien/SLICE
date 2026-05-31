/**
 * Distill a parsed spec + the user's endpoint selection + config into the
 * `HostedMcpConfig` (the "fiche") stored by the hosted runtime. Tool names
 * reuse `toolNameFor` so a hosted MCP and its downloadable kit expose the
 * same tools.
 */
import type { ParsedSpec, SliceConfig } from '@shared/types';
import { toolNameFor } from './mcp-generator';
import type { HostedMcpConfig } from './hosted-mcp-factory';

export function specToHostedConfig(
  spec: ParsedSpec,
  selectedIds: string[],
  config: SliceConfig
): HostedMcpConfig {
  const selected = new Set(selectedIds);
  const endpoints = spec.groups
    .flatMap((g) => g.endpoints)
    .filter((e) => selected.has(e.id))
    .map((e) => ({
      name: toolNameFor(e),
      description: (e.description ?? e.label).split('\n')[0],
      method: e.method,
      path: e.path,
      params: e.params,
    }));

  return {
    name: config.mcpName,
    baseUrl: config.baseUrl,
    upstreamAuth: config.upstreamAuth,
    endpoints,
  };
}

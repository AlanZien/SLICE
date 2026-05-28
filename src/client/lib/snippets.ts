/**
 * Pure builders for the connection snippets shown on the success screen.
 * Each function takes the resolved `SliceConfig` and returns the snippet
 * the user will copy-paste into the agent of their choice.
 *
 * Outputs are plain strings (not React nodes) so they can be passed through
 * `navigator.clipboard.writeText` without re-rendering.
 */
import type { SliceConfig } from '@shared/types';

const DEFAULT_HTTP_PORT = 8787;
const PLACEHOLDER_HOST = 'your-host';
const PLACEHOLDER_PATH = '/absolute/path/to';

/** Build the Claude Desktop `claude_desktop_config.json` snippet. */
export function buildClaudeDesktopSnippet(config: SliceConfig): string {
  const env: Record<string, string> = {
    UPSTREAM_BASE_URL: config.baseUrl,
  };
  if (config.upstreamAuth.type === 'apiKey') {
    env.UPSTREAM_API_KEY = '<your-key>';
  } else if (config.upstreamAuth.type === 'bearer') {
    env.UPSTREAM_BEARER_TOKEN = '<your-token>';
  }
  const block = {
    mcpServers: {
      [config.mcpName]: {
        command: 'node',
        args: [`${PLACEHOLDER_PATH}/${config.mcpName}/dist/index.js`],
        env,
      },
    },
  };
  return JSON.stringify(block, null, 2);
}

/** Build the n8n MCP Client node configuration snippet. */
export function buildN8nSnippet(config: SliceConfig): string {
  const url = `http://${PLACEHOLDER_HOST}:${DEFAULT_HTTP_PORT}`;
  const token = config.mcpServerToken ?? '<MCP_SERVER_TOKEN>';
  return [
    `# n8n — MCP Client node`,
    `URL:     ${url}`,
    `Header:  Authorization: Bearer ${token}`,
    ``,
    `# The MCP must be started with MCP_TRANSPORT=http on ${PLACEHOLDER_HOST}.`,
  ].join('\n');
}

/** Build the Airia connection block. */
export function buildAiriaSnippet(config: SliceConfig): string {
  const url = `http://${PLACEHOLDER_HOST}:${DEFAULT_HTTP_PORT}`;
  const token = config.mcpServerToken ?? '<MCP_SERVER_TOKEN>';
  return [
    `# Airia — MCP Connector`,
    `Name:    ${config.mcpName}`,
    `URL:     ${url}`,
    `Auth:    Bearer ${token}`,
  ].join('\n');
}

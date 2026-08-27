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

/**
 * Placeholder the user replaces with the token of their *own* upstream API.
 * SLICE never stores it — the hosted runtime relays whatever the agent sends
 * in `Authorization: Bearer …` (RC2.2 / RC5.3).
 */
export const TOKEN_PLACEHOLDER = 'PASTE_YOUR_TOKEN_HERE';

/** True when the upstream API requires no credentials — no token to ask for. */
function isPublicUpstream(config: SliceConfig): boolean {
  return config.upstreamAuth.type === 'none';
}

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

// ── Hosted (URL-mode) snippets — RC5.3 ──────────────────────────────────────
// The MCP lives at a real `url`; the agent connects over HTTP and forwards its
// own upstream token in `Authorization: Bearer …`. The stdio `command` form
// disappears from the nominal flow (RC5.8). The token is a placeholder the
// user swaps for the token of their target API.

/** Build the Claude Desktop block for a remotely-hosted MCP (mcp-remote via npx). */
export function buildHostedClaudeSnippet(url: string, config: SliceConfig): string {
  const block = {
    mcpServers: {
      [config.mcpName]: {
        command: 'npx',
        args: isPublicUpstream(config)
          ? ['-y', 'mcp-remote', url]
          : ['-y', 'mcp-remote', url, '--header', `Authorization:Bearer ${TOKEN_PLACEHOLDER}`],
      },
    },
  };
  return JSON.stringify(block, null, 2);
}

/** Build the n8n MCP Client node block for a remotely-hosted MCP. */
export function buildHostedN8nSnippet(url: string, config: SliceConfig): string {
  if (isPublicUpstream(config)) {
    return [
      `# n8n — MCP Client node`,
      `URL:     ${url}`,
      ``,
      `# This API is public — no token needed.`,
    ].join('\n');
  }
  return [
    `# n8n — MCP Client node`,
    `URL:     ${url}`,
    `Header:  Authorization: Bearer ${TOKEN_PLACEHOLDER}`,
    ``,
    `# Replace ${TOKEN_PLACEHOLDER} with the token of your target API.`,
  ].join('\n');
}

/** Build the Airia connection block for a remotely-hosted MCP. */
export function buildHostedAiriaSnippet(url: string, config: SliceConfig): string {
  const lines = [
    `# Airia — MCP Connector`,
    `Name:    ${config.mcpName}`,
    `URL:     ${url}`,
  ];
  if (!isPublicUpstream(config)) lines.push(`Auth:    Bearer ${TOKEN_PLACEHOLDER}`);
  return lines.join('\n');
}

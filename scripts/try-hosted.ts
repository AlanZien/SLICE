/**
 * Manual UAT helper for the hosted runtime — connect to a SLICE-hosted MCP and
 * exercise it with a REAL upstream token, without ever putting the token on the
 * command line or in the chat.
 *
 *   NOTION_TOKEN=secret_xxx pnpm exec tsx scripts/try-hosted.ts <hosted-url> [toolName] [jsonArgs]
 *
 * Examples:
 *   # just list the tools the hosted MCP exposes (no token needed):
 *   pnpm exec tsx scripts/try-hosted.ts http://localhost:3001/m/<id>
 *
 *   # call a tool with the relayed token + a required header param:
 *   NOTION_TOKEN=ntn_xxx pnpm exec tsx scripts/try-hosted.ts \
 *     http://localhost:3001/m/<id> get_v1.users.me '{"Notion-Version":"2022-06-28"}'
 *
 * The token is sent as `Authorization: Bearer <token>` on the MCP transport;
 * the hosted runtime relays it to the upstream API. `Notion-Version` (and any
 * other `in: header` param) is passed as a tool argument.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const [, , url, toolName, jsonArgs] = process.argv;
const token = process.env.NOTION_TOKEN ?? process.env.API_TOKEN ?? '';

if (!url) {
  console.error('usage: tsx scripts/try-hosted.ts <hosted-url> [toolName] [jsonArgs]');
  process.exit(1);
}

async function main(): Promise<void> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const client = new Client({ name: 'try-hosted', version: '0.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(url!), {
    requestInit: { headers },
  });
  await client.connect(transport);

  const { tools } = await client.listTools();
  console.log(`\nTools exposed (${tools.length}):`);
  for (const t of tools) console.log(`  - ${t.name}`);

  if (toolName) {
    const args = jsonArgs ? (JSON.parse(jsonArgs) as Record<string, unknown>) : {};
    console.log(`\nCalling ${toolName} with`, args, token ? '(token relayed)' : '(NO token set)');
    const res = await client.callTool({ name: toolName, arguments: args });
    console.log('\nResult:\n' + JSON.stringify(res, null, 2));
  }

  await client.close();
}

main().catch((err) => {
  console.error('\nFAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});

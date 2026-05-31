// TEMP demo generator — produces a runnable MCP kit from a public no-auth API
// into ~/Desktop/slice-demo-mcp, so we can wire it into Claude Desktop.
// Delete after the demo.
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { parseSpec } from './parser';
import { generateMcp } from './mcp-generator';
import type { GenerateRequest } from '@shared/types';

const SPEC = `openapi: 3.0.3
info:
  title: JSONPlaceholder
  version: "1.0"
servers:
  - url: https://jsonplaceholder.typicode.com
paths:
  /posts:
    get:
      operationId: listPosts
      summary: List all blog posts
      responses:
        '200': { description: ok }
  /posts/{id}:
    get:
      operationId: getPost
      summary: Get one blog post by id
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: integer }
      responses:
        '200': { description: ok }
  /users:
    get:
      operationId: listUsers
      summary: List all users
      responses:
        '200': { description: ok }
`;

describe('DEMO — generate a runnable JSONPlaceholder MCP kit', () => {
  it('writes a stdio kit to ~/Desktop/slice-demo-mcp', async () => {
    const parsed = await parseSpec(SPEC, { sizeBytes: SPEC.length });
    const selectedIds = parsed.groups.flatMap((g) => g.endpoints.map((e) => e.id));
    expect(selectedIds.length).toBe(3);

    const req: GenerateRequest = {
      parsedSpec: parsed,
      rawSpec: SPEC,
      selectedIds,
      config: {
        mcpName: 'jsonplaceholder',
        baseUrl: 'https://jsonplaceholder.typicode.com',
        upstreamAuth: { type: 'none' },
        hosting: 'self',
        mode: 'local', // stdio — Claude Desktop launches it directly
        includeParamDescriptions: true,
        retryOnServerError: false,
      },
    };

    const dir = join(homedir(), 'Desktop', 'slice-demo-mcp');
    rmSync(dir, { recursive: true, force: true });
    for (const f of generateMcp(req)) {
      const full = join(dir, f.path);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, f.content, 'utf-8');
    }
    // eslint-disable-next-line no-console
    console.log('DEMO_KIT_WRITTEN', dir, 'tools:', selectedIds.join(', '));
  });
});

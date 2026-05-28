import { z } from 'zod';

/**
 * Shared validation contract for the configuration step (phase 06) and the
 * generation request (phase 07). The same schema runs in the browser (form
 * feedback) and on the server (request guard) — a single source of truth.
 */

export const mcpNameSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'lowercase letters, digits and dashes only')
  .min(3, 'at least 3 characters')
  .max(40, 'at most 40 characters');

export const baseUrlSchema = z
  .string()
  .min(1, 'required')
  .refine(
    (value) => {
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    },
    'must be a valid http(s) URL'
  );

const upstreamAuthSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }),
  z.object({
    type: z.literal('apiKey'),
    headerName: z.string().min(1, 'header name required for API key auth'),
  }),
  z.object({ type: z.literal('bearer') }),
]);

const mcpServerTokenSchema = z
  .string()
  .regex(/^[a-f0-9]{32}$/i, 'must be 32 hex characters');

export const sliceConfigSchema = z
  .object({
    mcpName: mcpNameSchema,
    baseUrl: baseUrlSchema,
    upstreamAuth: upstreamAuthSchema,
    mode: z.enum(['local', 'remote', 'both']),
    mcpServerToken: mcpServerTokenSchema.optional(),
    includeParamDescriptions: z.boolean(),
    retryOnServerError: z.boolean(),
  })
  .superRefine((cfg, ctx) => {
    // The MCP_SERVER_TOKEN is the Bearer that the agent forwards to the
    // generated MCP when it's exposed over HTTP. Required for any mode that
    // ships the HTTP transport; irrelevant when only `stdio` is built.
    if (cfg.mode !== 'local' && !cfg.mcpServerToken) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mcpServerToken'],
        message: 'required when the MCP is exposed over HTTP',
      });
    }
  });

export type SliceConfigInput = z.input<typeof sliceConfigSchema>;
export type SliceConfigOutput = z.output<typeof sliceConfigSchema>;

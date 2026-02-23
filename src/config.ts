import 'dotenv/config';
import { z } from 'zod';

const commaSeparatedIds = z
  .string()
  .optional()
  .default('')
  .transform((val) => {
    if (!val.trim()) return [];
    return val.split(',').map((id) => Number(id.trim())).filter(Boolean);
  });

const envSchema = z.object({
  // Interfaces
  TELEGRAM_ENABLED: z.coerce.boolean().default(true),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(''),
  API_ENABLED: z.coerce.boolean().default(true),
  API_PORT: z.coerce.number().int().positive().default(3000),
  API_KEY: z.string().optional().default(''),
  API_ALLOW_ANONYMOUS: z.coerce.boolean().default(false),
  API_MAX_BODY_BYTES: z.coerce.number().int().positive().default(1_048_576),
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  CLI_ENABLED: z.coerce.boolean().default(true),

  // Auth
  SINGLE_USER_MODE: z.coerce.boolean().default(false),
  TELEGRAM_ALLOW_PUBLIC: z.coerce.boolean().default(false),
  TELEGRAM_ALLOWED_USERS: commaSeparatedIds,

  // Providers
  DEFAULT_PROVIDER: z.string().default('claude-cli'),
  CLAUDE_BIN: z.string().default('claude'),
  CLAUDE_SKIP_PERMISSIONS: z.coerce.boolean().default(false),
  GEMINI_BIN: z.string().default('gemini'),
  CODEX_BIN: z.string().default('codex'),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().optional().default(''),
  GOOGLE_API_KEY: z.string().optional().default(''),
  OPENROUTER_API_KEY: z.string().optional().default(''),
  OPENROUTER_MODEL: z.string().default('anthropic/claude-sonnet-4'),

  // Vault
  VAULT_PATH: z.string().default('./vault'),
  DATA_PATH: z.string().default('./data'),

  // Synthesis
  SYNTHESIS_ENABLED: z.coerce.boolean().default(true),
  SYNTHESIS_SCHEDULE: z.string().default('0 9 * * 0'),
  SYNTHESIS_PROVIDER: z.string().default('claude-cli'),

  // General
  RESPONSE_TIMEOUT_MS: z.coerce.number().int().positive().default(300_000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Environment validation failed:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
export type Config = z.infer<typeof envSchema>;

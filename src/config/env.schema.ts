import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  BOT_TOKEN: z.string().min(1),
  BOT_API_ADDRESS: z.string().url().optional(),
  BOT_DATA_PATH: z.string().optional(),
  BOT_DATA_TORRENTS_PATH: z.string().optional(),
  QBT_WEBUI_ADDRESS: z.string().optional(),
  QBT_WEBUI_USERNAME: z.string().optional(),
  QBT_WEBUI_PASSWORD: z.string().optional(),
  QBT_SAVE_PATH: z.string().optional(),
  SECRET_KEY: z.string().min(8),
  RUTRACKER_USERNAME: z.string().optional(),
  RUTRACKER_PASSWORD: z.string().optional(),
  USE_NEW_HANDLERS: z.coerce.boolean().optional().default(false),
  BOT_REGISTER_COMMANDS: z.coerce.boolean().optional().default(true),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(): AppConfig {
  // We intentionally use process.env here; callers should handle ZodError if validation fails.
  return envSchema.parse(process.env as Record<string, unknown>);
}

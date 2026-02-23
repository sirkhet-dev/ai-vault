import type { Context, NextFunction } from 'grammy';
import { config } from '../../config.js';
import { logger } from '../../logger.js';

export async function authMiddleware(ctx: Context, next: NextFunction): Promise<void> {
  // Single user mode always allows local operation
  if (config.SINGLE_USER_MODE) {
    await next();
    return;
  }

  // Public Telegram mode must be explicitly enabled
  if (config.TELEGRAM_ALLOWED_USERS.length === 0) {
    if (config.TELEGRAM_ALLOW_PUBLIC) {
      await next();
      return;
    }
    logger.warn('Telegram request rejected: TELEGRAM_ALLOWED_USERS is empty and TELEGRAM_ALLOW_PUBLIC is false');
    return;
  }

  const userId = ctx.from?.id;
  if (!userId || !config.TELEGRAM_ALLOWED_USERS.includes(userId)) {
    logger.warn({ userId, username: ctx.from?.username }, 'Unauthorized Telegram access attempt');
    return; // Silent rejection
  }

  await next();
}

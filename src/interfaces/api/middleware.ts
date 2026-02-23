import type { Context, Next } from 'hono';
import { config } from '../../config.js';
import { logger } from '../../logger.js';
import { validateApiKey, resolveUserIdFromApiKey } from '../../users/auth.js';

interface RateLimitState {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitState>();

function getClientIp(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return c.req.header('x-real-ip') ?? 'unknown';
}

export async function apiBodySizeMiddleware(c: Context, next: Next): Promise<Response | void> {
  if (!['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
    return next();
  }

  const len = c.req.header('content-length');
  if (len) {
    const contentLength = Number(len);
    if (Number.isFinite(contentLength) && contentLength > config.API_MAX_BODY_BYTES) {
      return c.json({ error: `Payload too large. Max ${config.API_MAX_BODY_BYTES} bytes.` }, 413);
    }
  }

  return next();
}

export async function apiRateLimitMiddleware(c: Context, next: Next): Promise<Response | void> {
  const key = `${getClientIp(c)}:${c.req.path}`;
  const now = Date.now();
  const state = rateLimitStore.get(key);

  if (!state || now >= state.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.API_RATE_LIMIT_WINDOW_MS,
    });
    return next();
  }

  if (state.count >= config.API_RATE_LIMIT_MAX) {
    return c.json({ error: 'Rate limit exceeded. Try again later.' }, 429);
  }

  state.count += 1;
  rateLimitStore.set(key, state);
  return next();
}

export async function apiAuthMiddleware(c: Context, next: Next): Promise<Response | void> {
  // API key not configured: block unless explicitly enabled
  if (!config.API_KEY) {
    if (!config.API_ALLOW_ANONYMOUS) {
      logger.warn('API request rejected: API_KEY is missing and API_ALLOW_ANONYMOUS is false');
      return c.json({ error: 'Unauthorized. Configure API_KEY or set API_ALLOW_ANONYMOUS=true.' }, 401);
    }

    c.set('userId', config.SINGLE_USER_MODE ? 'cli_local' : 'api_anonymous');
    return next();
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('API request without valid Authorization header');
    return c.json({ error: 'Unauthorized. Provide Authorization: Bearer <API_KEY>' }, 401);
  }

  const token = authHeader.slice(7);
  if (!validateApiKey(token)) {
    logger.warn('API request with invalid API key');
    return c.json({ error: 'Invalid API key' }, 401);
  }

  c.set('userId', resolveUserIdFromApiKey(token));
  return next();
}

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { config } from '../../config.js';
import { logger } from '../../logger.js';
import type { AppInterface } from '../types.js';
import { createApiRoutes } from './routes.js';

export class APIInterface implements AppInterface {
  readonly name = 'api';
  private server: ReturnType<typeof serve> | null = null;

  async start(): Promise<void> {
    const app = new Hono();

    // Health check
    app.get('/health', (c) => c.json({ status: 'ok', version: '1.5.0' }));

    // API v1 routes
    app.route('/api/v1', createApiRoutes());

    this.server = serve({
      fetch: app.fetch,
      port: config.API_PORT,
    });

    logger.info({ port: config.API_PORT }, 'REST API interface started');
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.close();
      logger.info('REST API interface stopped');
    }
  }
}

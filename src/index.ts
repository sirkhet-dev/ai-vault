import { config } from './config.js';
import { logger } from './logger.js';
import { initProviders } from './providers/registry.js';
import type { AppInterface } from './interfaces/types.js';

const interfaces: AppInterface[] = [];

async function start(): Promise<void> {
  logger.info('AI Vault starting...');

  // Initialize providers
  await initProviders();

  // Start enabled interfaces
  if (config.TELEGRAM_ENABLED && config.TELEGRAM_BOT_TOKEN) {
    try {
      const { TelegramInterface } = await import('./interfaces/telegram/bot.js');
      const telegram = new TelegramInterface();
      await telegram.start();
      interfaces.push(telegram);
    } catch (err) {
      logger.error({ err }, 'Failed to start Telegram interface');
    }
  }

  if (config.API_ENABLED) {
    try {
      const { APIInterface } = await import('./interfaces/api/server.js');
      const api = new APIInterface();
      await api.start();
      interfaces.push(api);
    } catch (err) {
      logger.error({ err }, 'Failed to start API interface');
    }
  }

  const cliOnly = process.argv.includes('--cli-only');
  if (config.CLI_ENABLED || cliOnly) {
    try {
      const { CLIInterface } = await import('./interfaces/cli/repl.js');
      const cli = new CLIInterface();
      await cli.start();
      interfaces.push(cli);
    } catch (err) {
      logger.error({ err }, 'Failed to start CLI interface');
    }
  }

  // Start synthesis scheduler
  if (config.SYNTHESIS_ENABLED) {
    try {
      const { startScheduler } = await import('./synthesis/scheduler.js');
      startScheduler();
    } catch {
      // Synthesis not yet implemented
    }
  }

  if (interfaces.length === 0) {
    logger.warn('No interfaces started. Check your configuration.');
  } else {
    logger.info(
      { interfaces: interfaces.map((i) => i.name) },
      'AI Vault is running',
    );
  }
}

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down...');
  for (const iface of interfaces) {
    try {
      await iface.stop();
    } catch (err) {
      logger.error({ interface: iface.name, err }, 'Error stopping interface');
    }
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((err) => {
  logger.fatal({ err }, 'Failed to start AI Vault');
  process.exit(1);
});

import readline from 'node:readline';
import { config } from '../../config.js';
import { logger } from '../../logger.js';
import { execute } from '../../core/engine.js';
import { getSession } from '../../core/session.js';
import { resolveUserIdFromCli } from '../../users/auth.js';
import type { AppInterface } from '../types.js';
import { handleCommand } from './commands.js';
import { formatPrompt, formatResponse, formatHeader, formatError } from './formatter.js';
import * as vault from '../../vault/manager.js';
import { search } from '../../vault/search.js';
import type { VaultCategory } from '../../types.js';

export class CLIInterface implements AppInterface {
  readonly name = 'cli';
  private rl: readline.Interface | null = null;
  private userId = resolveUserIdFromCli();

  async start(): Promise<void> {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(formatHeader('\n  AI Vault CLI'));
    console.log('  Type /help for commands, /quit to exit.\n');

    this.prompt();
  }

  async stop(): Promise<void> {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    logger.info('CLI interface stopped');
  }

  private prompt(): void {
    if (!this.rl) return;

    const session = getSession(this.userId, config.DEFAULT_PROVIDER);
    this.rl.question(formatPrompt(session.providerId), async (input) => {
      const trimmed = input.trim();
      if (!trimmed) {
        this.prompt();
        return;
      }

      // Handle slash commands
      if (trimmed.startsWith('/')) {
        await this.handleSlashCommand(trimmed);
        return;
      }

      // Regular prompt to LLM
      await this.handlePrompt(trimmed);
    });
  }

  private async handleSlashCommand(input: string): Promise<void> {
    // Async commands
    if (input.startsWith('/search ')) {
      const query = input.slice(8).trim();
      try {
        const results = await search(this.userId, query);
        if (results.length === 0) {
          console.log('No results found.');
        } else {
          results.slice(0, 10).forEach((r, i) => {
            console.log(`  ${i + 1}. ${r.filepath}`);
            console.log(`     ${r.snippet}`);
          });
        }
      } catch {
        console.log('Search not available.');
      }
      this.prompt();
      return;
    }

    if (input.startsWith('/list')) {
      const category = input.split(/\s+/)[1] as VaultCategory | undefined;
      try {
        const notes = await vault.listNotes(this.userId, category);
        if (notes.length === 0) {
          console.log('No notes found.');
        } else {
          notes.slice(0, 20).forEach((n) => console.log(`  ${n.filepath}`));
        }
      } catch {
        console.log('Vault not available.');
      }
      this.prompt();
      return;
    }

    if (input.startsWith('/save')) {
      const args = input.split(/\s+/).slice(1);
      const category = (args[0] || 'brainstorm') as VaultCategory;
      const title = args.slice(1).join(' ') || undefined;
      const session = getSession(this.userId, config.DEFAULT_PROVIDER);
      const lastMessages = session.messageHistory.slice(-2);

      if (lastMessages.length === 0) {
        console.log('No conversation to save.');
      } else {
        try {
          const content = lastMessages.map((m) => `**${m.role}:** ${m.content}`).join('\n\n---\n\n');
          const filepath = await vault.saveFromChat(this.userId, category, content, title);
          console.log(`Saved to ${filepath}`);
        } catch {
          console.log('Save failed.');
        }
      }
      this.prompt();
      return;
    }

    // Sync commands
    const result = handleCommand(input);
    if (result) {
      console.log(result.output);
      if (result.exit) {
        this.stop();
        return;
      }
    }
    this.prompt();
  }

  private async handlePrompt(text: string): Promise<void> {
    process.stdout.write('\n');

    const result = await execute({
      userId: this.userId,
      message: text,
      sessionId: getSession(this.userId, config.DEFAULT_PROVIDER).sessionId,
    });

    if (result.isError) {
      console.log(formatError(result.text));
    } else {
      console.log(formatResponse(result.text, result.providerId, result.durationMs, result.costUsd));
    }

    console.log('');
    this.prompt();
  }
}

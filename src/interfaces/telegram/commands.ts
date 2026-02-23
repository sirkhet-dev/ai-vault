import type { Context } from 'grammy';
import { config } from '../../config.js';
import { getSession, resetSession, setProvider } from '../../core/session.js';
import { cancelCurrent } from '../../core/queue.js';
import { listProviders, getProvider } from '../../providers/registry.js';

function resolveUserId(ctx: Context): string {
  if (config.SINGLE_USER_MODE) return 'cli_local';
  return `telegram_${ctx.from?.id}`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function startCommand(ctx: Context): Promise<void> {
  const providers = listProviders().map((p) => `  - <code>${escapeHtml(p.id)}</code> (${escapeHtml(p.name)})`).join('\n');
  await ctx.reply(
    `<b>Welcome to AI Vault</b>\n\n` +
    `Your AI-powered knowledge vault. Send any message to start a conversation.\n\n` +
    `<b>Available providers:</b>\n${providers}\n\n` +
    `Use /help to see all commands.`,
    { parse_mode: 'HTML' },
  );
}

export async function helpCommand(ctx: Context): Promise<void> {
  await ctx.reply(
    `<b>AI Vault Commands</b>\n\n` +
    `/start — Welcome message\n` +
    `/new — Start a new conversation\n` +
    `/stop — Cancel current request\n` +
    `/status — Show session info\n` +
    `/provider &lt;id&gt; — Switch LLM provider\n` +
    `/save &lt;category&gt; [title] — Save last chat to vault\n` +
    `/search &lt;query&gt; — Search the vault\n` +
    `/list [category] — List vault notes\n` +
    `/synthesize — Trigger vault synthesis\n` +
    `/help — This message`,
    { parse_mode: 'HTML' },
  );
}

export async function newCommand(ctx: Context): Promise<void> {
  const userId = resolveUserId(ctx);
  resetSession(userId);
  await ctx.reply('New conversation started.', { parse_mode: 'HTML' });
}

export async function stopCommand(ctx: Context): Promise<void> {
  const userId = resolveUserId(ctx);
  const cancelled = cancelCurrent(userId, config.DEFAULT_PROVIDER);
  await ctx.reply(cancelled ? 'Request cancelled.' : 'No active request to cancel.');
}

export async function statusCommand(ctx: Context): Promise<void> {
  const userId = resolveUserId(ctx);
  const session = getSession(userId, config.DEFAULT_PROVIDER);
  const provider = getProvider(session.providerId);

  await ctx.reply(
    `<b>Status</b>\n\n` +
    `Provider: <code>${escapeHtml(session.providerId)}</code>\n` +
    `Session: <code>${session.sessionId ? session.sessionId.slice(0, 12) + '...' : 'none'}</code>\n` +
    `Busy: ${session.busy ? 'Yes' : 'No'}\n` +
    `Messages: ${session.messageHistory.length}`,
    { parse_mode: 'HTML' },
  );
}

export async function providerCommand(ctx: Context): Promise<void> {
  const userId = resolveUserId(ctx);
  const text = ctx.message?.text ?? '';
  const args = text.split(/\s+/).slice(1);

  if (args.length === 0) {
    const providers = listProviders()
      .map((p) => {
        const session = getSession(userId, config.DEFAULT_PROVIDER);
        const active = p.id === session.providerId ? ' (active)' : '';
        return `  <code>${escapeHtml(p.id)}</code>${active}`;
      })
      .join('\n');
    await ctx.reply(`<b>Providers:</b>\n${providers}\n\nUsage: /provider &lt;id&gt;`, { parse_mode: 'HTML' });
    return;
  }

  const providerId = args[0];
  const provider = getProvider(providerId);
  if (!provider) {
    await ctx.reply(`Unknown provider: <code>${escapeHtml(providerId)}</code>`, { parse_mode: 'HTML' });
    return;
  }

  setProvider(userId, providerId, config.DEFAULT_PROVIDER);
  await ctx.reply(`Switched to <code>${escapeHtml(provider.name)}</code>. Conversation reset.`, { parse_mode: 'HTML' });
}

export async function saveCommand(ctx: Context): Promise<void> {
  const userId = resolveUserId(ctx);
  const text = ctx.message?.text ?? '';
  const args = text.split(/\s+/).slice(1);

  const category = args[0] || 'brainstorm';
  const title = args.slice(1).join(' ') || undefined;

  try {
    const { saveFromChat } = await import('../../vault/manager.js');
    const session = getSession(userId, config.DEFAULT_PROVIDER);
    const lastMessages = session.messageHistory.slice(-2);

    if (lastMessages.length === 0) {
      await ctx.reply('No conversation to save. Send a message first.');
      return;
    }

    const content = lastMessages.map((m) => `**${m.role}:** ${m.content}`).join('\n\n---\n\n');
    const filepath = await saveFromChat(userId, category as 'brainstorm' | 'active' | 'archive', content, title);
    await ctx.reply(`Saved to <code>${escapeHtml(filepath)}</code>`, { parse_mode: 'HTML' });
  } catch (err) {
    await ctx.reply('Failed to save. Vault system may not be initialized.');
  }
}

export async function searchCommand(ctx: Context): Promise<void> {
  const text = ctx.message?.text ?? '';
  const query = text.replace(/^\/search\s*/, '').trim();

  if (!query) {
    await ctx.reply('Usage: /search &lt;query&gt;', { parse_mode: 'HTML' });
    return;
  }

  const userId = resolveUserId(ctx);
  try {
    const { search } = await import('../../vault/search.js');
    const results = await search(userId, query);

    if (results.length === 0) {
      await ctx.reply('No results found.');
      return;
    }

    const formatted = results
      .slice(0, 10)
      .map((r, i) => `${i + 1}. <code>${escapeHtml(r.filepath)}</code>\n   ${escapeHtml(r.snippet)}`)
      .join('\n\n');
    await ctx.reply(`<b>Search results:</b>\n\n${formatted}`, { parse_mode: 'HTML' });
  } catch {
    await ctx.reply('Search not available. Vault system may not be initialized.');
  }
}

export async function listCommand(ctx: Context): Promise<void> {
  const text = ctx.message?.text ?? '';
  const args = text.split(/\s+/).slice(1);
  const category = args[0] || undefined;
  const userId = resolveUserId(ctx);

  try {
    const { listNotes } = await import('../../vault/manager.js');
    const notes = await listNotes(userId, category as 'brainstorm' | 'active' | 'archive' | undefined);

    if (notes.length === 0) {
      await ctx.reply(category ? `No notes in ${category}.` : 'Vault is empty.');
      return;
    }

    const formatted = notes
      .slice(0, 20)
      .map((n) => `  <code>${escapeHtml(n.filepath)}</code>`)
      .join('\n');
    await ctx.reply(`<b>Notes (${notes.length}):</b>\n${formatted}`, { parse_mode: 'HTML' });
  } catch {
    await ctx.reply('List not available. Vault system may not be initialized.');
  }
}

export async function synthesizeCommand(ctx: Context): Promise<void> {
  await ctx.reply('Starting synthesis...');
  try {
    const { runSynthesis } = await import('../../synthesis/digest.js');
    const userId = resolveUserId(ctx);
    const result = await runSynthesis(userId);
    await ctx.reply(`Synthesis complete: <code>${escapeHtml(result)}</code>`, { parse_mode: 'HTML' });
  } catch {
    await ctx.reply('Synthesis not available or failed.');
  }
}

import type { Context } from 'hono';
import { z } from 'zod';
import { config } from '../../config.js';
import { execute } from '../../core/engine.js';
import { getSession, resetSession, setProvider } from '../../core/session.js';
import { cancelCurrent } from '../../core/queue.js';
import { listProviders, getProvider } from '../../providers/registry.js';
import * as vault from '../../vault/manager.js';
import { search } from '../../vault/search.js';
import type { VaultCategory } from '../../types.js';

const categorySchema = z.enum(['brainstorm', 'active', 'archive']);

const chatSchema = z.object({
  message: z.string().min(1),
  provider: z.string().optional(),
});

const createNoteSchema = z.object({
  category: categorySchema,
  title: z.string().min(1),
  body: z.string().min(1),
  tags: z.array(z.string().min(1)).max(32).optional(),
});

const updateNoteSchema = z.object({
  body: z.string().min(1),
});

const searchSchema = z.object({
  query: z.string().min(1),
  category: categorySchema.optional(),
  tags: z.array(z.string().min(1)).max(32).optional(),
  limit: z.number().int().positive().max(100).optional(),
});

const saveFromChatSchema = z.object({
  category: categorySchema.optional(),
  title: z.string().min(1).max(200).optional(),
});

const setProviderSchema = z.object({
  provider: z.string().min(1),
});

async function parseJson<T>(c: Context, schema: z.ZodSchema<T>): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  try {
    const raw = await c.req.json();
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, response: c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400) };
    }
    return { ok: true, data: parsed.data };
  } catch {
    return { ok: false, response: c.json({ error: 'Invalid JSON body' }, 400) };
  }
}

function decodePathParam(param: string | undefined): string | null {
  if (!param) return null;
  try {
    return decodeURIComponent(param);
  } catch {
    return null;
  }
}

function getUserId(c: Context): string {
  return c.get('userId') ?? 'api_anonymous';
}

// POST /api/v1/chat
export async function chatHandler(c: Context): Promise<Response> {
  const userId = getUserId(c);
  const parsed = await parseJson(c, chatSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const result = await execute({
    userId,
    message: body.message,
    sessionId: getSession(userId, config.DEFAULT_PROVIDER).sessionId,
    providerId: body.provider,
  });

  return c.json(result);
}

// DELETE /api/v1/session
export async function sessionResetHandler(c: Context): Promise<Response> {
  const userId = getUserId(c);
  cancelCurrent(userId, config.DEFAULT_PROVIDER);
  resetSession(userId);
  return c.json({ ok: true });
}

// GET /api/v1/vault/notes
export async function listNotesHandler(c: Context): Promise<Response> {
  const userId = getUserId(c);
  const category = c.req.query('category') as VaultCategory | undefined;
  const notes = await vault.listNotes(userId, category);
  return c.json({ notes });
}

// GET /api/v1/vault/notes/:filepath
export async function getNoteHandler(c: Context): Promise<Response> {
  const userId = getUserId(c);
  const filepath = decodePathParam(c.req.param('filepath'));
  if (!filepath) return c.json({ error: 'filepath is required' }, 400);

  const note = await vault.getNote(userId, filepath);
  if (!note) return c.json({ error: 'Note not found' }, 404);
  return c.json({ note });
}

// POST /api/v1/vault/notes
export async function createNoteHandler(c: Context): Promise<Response> {
  const userId = getUserId(c);
  const parsed = await parseJson(c, createNoteSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const filepath = await vault.createNote(userId, body.category, body.title, body.body, body.tags);
  return c.json({ filepath }, 201);
}

// PUT /api/v1/vault/notes/:filepath
export async function updateNoteHandler(c: Context): Promise<Response> {
  const userId = getUserId(c);
  const filepath = decodePathParam(c.req.param('filepath'));
  if (!filepath) return c.json({ error: 'filepath is required' }, 400);

  const parsed = await parseJson(c, updateNoteSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const updated = await vault.updateNote(userId, filepath, body.body);
  if (!updated) return c.json({ error: 'Note not found' }, 404);
  return c.json({ ok: true });
}

// DELETE /api/v1/vault/notes/:filepath
export async function deleteNoteHandler(c: Context): Promise<Response> {
  const userId = getUserId(c);
  const filepath = decodePathParam(c.req.param('filepath'));
  if (!filepath) return c.json({ error: 'filepath is required' }, 400);

  const deleted = await vault.deleteNote(userId, filepath);
  if (!deleted) return c.json({ error: 'Note not found' }, 404);
  return c.json({ ok: true });
}

// POST /api/v1/vault/search
export async function searchHandler(c: Context): Promise<Response> {
  const userId = getUserId(c);
  const parsed = await parseJson(c, searchSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const results = await search(userId, body.query, {
    category: body.category,
    tags: body.tags,
    limit: body.limit,
  });
  return c.json({ results });
}

// POST /api/v1/vault/save
export async function saveFromChatHandler(c: Context): Promise<Response> {
  const userId = getUserId(c);
  const parsed = await parseJson(c, saveFromChatSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const session = getSession(userId, config.DEFAULT_PROVIDER);
  const lastMessages = session.messageHistory.slice(-2);

  if (lastMessages.length === 0) {
    return c.json({ error: 'No conversation to save' }, 400);
  }

  const content = lastMessages.map((m) => `**${m.role}:** ${m.content}`).join('\n\n---\n\n');
  const category = body.category ?? 'brainstorm';
  const filepath = await vault.saveFromChat(userId, category, content, body.title);
  return c.json({ filepath }, 201);
}

// POST /api/v1/synthesize
export async function synthesizeHandler(c: Context): Promise<Response> {
  const userId = getUserId(c);
  try {
    const { runSynthesis } = await import('../../synthesis/digest.js');
    const result = await runSynthesis(userId);
    return c.json({ filepath: result });
  } catch {
    return c.json({ error: 'Synthesis not available' }, 501);
  }
}

// GET /api/v1/providers
export async function providersHandler(c: Context): Promise<Response> {
  const userId = getUserId(c);
  const session = getSession(userId, config.DEFAULT_PROVIDER);
  const providers = listProviders().map((p) => ({
    id: p.id,
    name: p.name,
    mode: p.mode,
    active: p.id === session.providerId,
  }));
  return c.json({ providers });
}

// PUT /api/v1/provider
export async function setProviderHandler(c: Context): Promise<Response> {
  const userId = getUserId(c);
  const parsed = await parseJson(c, setProviderSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const provider = getProvider(body.provider);
  if (!provider) return c.json({ error: 'Unknown provider' }, 404);

  setProvider(userId, body.provider, config.DEFAULT_PROVIDER);
  return c.json({ ok: true, provider: { id: provider.id, name: provider.name } });
}

// GET /api/v1/status
export async function statusHandler(c: Context): Promise<Response> {
  const userId = getUserId(c);
  const session = getSession(userId, config.DEFAULT_PROVIDER);
  return c.json({
    userId,
    provider: session.providerId,
    sessionId: session.sessionId ? session.sessionId.slice(0, 12) + '...' : null,
    busy: session.busy,
    messageCount: session.messageHistory.length,
    providers: listProviders().map((p) => p.id),
  });
}

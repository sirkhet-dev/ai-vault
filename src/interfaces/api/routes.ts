import { Hono } from 'hono';
import { apiAuthMiddleware, apiBodySizeMiddleware, apiRateLimitMiddleware } from './middleware.js';
import {
  chatHandler,
  sessionResetHandler,
  listNotesHandler,
  getNoteHandler,
  createNoteHandler,
  updateNoteHandler,
  deleteNoteHandler,
  searchHandler,
  saveFromChatHandler,
  synthesizeHandler,
  providersHandler,
  setProviderHandler,
  statusHandler,
} from './handlers.js';

export function createApiRoutes(): Hono {
  const api = new Hono();

  // Auth middleware for all API routes
  api.use('*', apiRateLimitMiddleware);
  api.use('*', apiBodySizeMiddleware);
  api.use('*', apiAuthMiddleware);

  // Chat
  api.post('/chat', chatHandler);
  api.delete('/session', sessionResetHandler);

  // Vault
  api.get('/vault/notes', listNotesHandler);
  api.get('/vault/notes/:filepath{.+}', getNoteHandler);
  api.post('/vault/notes', createNoteHandler);
  api.put('/vault/notes/:filepath{.+}', updateNoteHandler);
  api.delete('/vault/notes/:filepath{.+}', deleteNoteHandler);
  api.post('/vault/search', searchHandler);
  api.post('/vault/save', saveFromChatHandler);

  // Synthesis
  api.post('/synthesize', synthesizeHandler);

  // Providers
  api.get('/providers', providersHandler);
  api.put('/provider', setProviderHandler);

  // Status
  api.get('/status', statusHandler);

  return api;
}

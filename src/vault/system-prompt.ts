import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { listNotes, getVaultPath } from './manager.js';
import type { UserId } from '../types.js';

export async function buildSystemPrompt(userId: UserId): Promise<string> {
  const vaultPath = getVaultPath(userId);

  // Try to load SYSTEM.md from vault root
  const systemFile = path.join(vaultPath, '..', 'SYSTEM.md');
  let basePrompt = '';
  if (fs.existsSync(systemFile)) {
    basePrompt = fs.readFileSync(systemFile, 'utf-8');
  } else {
    // Try vault root directly (for single-user mode)
    const altPath = path.join(path.resolve(config.VAULT_PATH), 'SYSTEM.md');
    if (fs.existsSync(altPath)) {
      basePrompt = fs.readFileSync(altPath, 'utf-8');
    }
  }

  if (!basePrompt) {
    basePrompt = DEFAULT_SYSTEM_PROMPT;
  }

  // Append vault context
  try {
    const notes = await listNotes(userId);
    if (notes.length > 0) {
      const noteList = notes
        .slice(0, 30)
        .map((n) => `- [${n.metadata.category}] ${n.metadata.title} (${n.filepath})`)
        .join('\n');
      basePrompt += `\n\n## Your Knowledge Vault\n\nYou have ${notes.length} notes:\n${noteList}`;
    }
  } catch {
    // Vault not available
  }

  return basePrompt;
}

const DEFAULT_SYSTEM_PROMPT = `You are AI Vault, an AI-powered knowledge assistant.

You help users:
- Think through ideas and problems
- Organize knowledge in a structured vault
- Find connections between thoughts
- Synthesize insights from their notes

When a user shares an idea, engage thoughtfully. Ask clarifying questions. Suggest ways to develop the idea further.

You have access to the user's knowledge vault organized in three categories:
- **brainstorm/**: Raw ideas, quick thoughts
- **active/**: Work in progress, ongoing projects
- **archive/**: Completed or paused items

Be concise but insightful. Focus on substance over form.`;

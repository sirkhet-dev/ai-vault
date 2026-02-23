import { config } from '../config.js';
import { logger } from '../logger.js';
import type { LLMProvider, LLMProviderHandle, LLMResult } from './types.js';

export class OpenRouterAPIProvider implements LLMProvider {
  readonly id = 'openrouter-api';
  readonly name = 'OpenRouter (API)';
  readonly mode = 'api' as const;

  supportsResume(): boolean {
    return false;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(config.OPENROUTER_API_KEY);
  }

  run(prompt: string, _workingDir: string, _sessionId: string | null, systemPrompt: string): LLMProviderHandle {
    logger.debug({ provider: this.id, model: config.OPENROUTER_MODEL }, 'OpenRouter API request');

    const promise = (async (): Promise<LLMResult> => {
      const messages: Array<{ role: string; content: string }> = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://github.com/sirkhet-dev/ai-vault',
          'X-Title': 'AI Vault',
        },
        body: JSON.stringify({
          model: config.OPENROUTER_MODEL,
          messages,
          max_tokens: 8192,
        }),
        signal: AbortSignal.timeout(config.RESPONSE_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          text: `OpenRouter API error (${response.status}): ${errorText}`,
          sessionId: null,
          costUsd: null,
          isError: true,
        };
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
        usage?: { prompt_tokens: number; completion_tokens: number; total_cost?: number };
      };

      const text = data.choices[0]?.message?.content ?? '';
      const costUsd = data.usage?.total_cost ?? null;

      return { text, sessionId: null, costUsd, isError: false };
    })();

    return { promise, process: null };
  }
}

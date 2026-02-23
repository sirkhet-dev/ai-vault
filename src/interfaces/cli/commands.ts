import { config } from '../../config.js';
import { resetSession, getSession, setProvider } from '../../core/session.js';
import { cancelCurrent } from '../../core/queue.js';
import { listProviders, getProvider } from '../../providers/registry.js';
import { resolveUserIdFromCli } from '../../users/auth.js';
import { formatHeader, formatSuccess, formatWarning, formatDim } from './formatter.js';

const userId = resolveUserIdFromCli();

export interface CommandResult {
  output: string;
  exit?: boolean;
}

export function handleCommand(input: string): CommandResult | null {
  if (!input.startsWith('/')) return null;

  const [cmd, ...args] = input.split(/\s+/);

  switch (cmd) {
    case '/help':
      return { output: helpText() };
    case '/new':
      resetSession(userId);
      return { output: formatSuccess('New conversation started.') };
    case '/stop':
      return { output: cancelCurrent(userId, config.DEFAULT_PROVIDER) ? formatSuccess('Cancelled.') : formatWarning('No active request.') };
    case '/status':
      return { output: statusText() };
    case '/provider':
      return { output: providerText(args[0]) };
    case '/providers':
      return { output: providersText() };
    case '/save':
      return { output: saveText(args) };
    case '/search':
      return { output: `Use: /search <query> (async — handled in REPL)` };
    case '/list':
      return { output: `Use: /list [category] (async — handled in REPL)` };
    case '/quit':
    case '/exit':
      return { output: 'Goodbye.', exit: true };
    default:
      return { output: formatWarning(`Unknown command: ${cmd}. Type /help for available commands.`) };
  }
}

function helpText(): string {
  return `${formatHeader('AI Vault CLI Commands')}

  /new              Start a new conversation
  /stop             Cancel current request
  /status           Show session info
  /provider <id>    Switch LLM provider
  /providers        List available providers
  /save [cat] [t]   Save last chat (cat: brainstorm|active|archive)
  /search <query>   Search the vault
  /list [category]  List vault notes
  /quit             Exit CLI`;
}

function statusText(): string {
  const session = getSession(userId, config.DEFAULT_PROVIDER);
  return `${formatHeader('Status')}
  Provider:  ${session.providerId}
  Session:   ${session.sessionId ? session.sessionId.slice(0, 12) + '...' : 'none'}
  Busy:      ${session.busy ? 'Yes' : 'No'}
  Messages:  ${session.messageHistory.length}`;
}

function providerText(providerId?: string): string {
  if (!providerId) return providersText();

  const provider = getProvider(providerId);
  if (!provider) return formatWarning(`Unknown provider: ${providerId}`);

  setProvider(userId, providerId, config.DEFAULT_PROVIDER);
  return formatSuccess(`Switched to ${provider.name}. Conversation reset.`);
}

function providersText(): string {
  const session = getSession(userId, config.DEFAULT_PROVIDER);
  const list = listProviders()
    .map((p) => `  ${p.id === session.providerId ? '>' : ' '} ${p.id} (${p.name})`)
    .join('\n');
  return `${formatHeader('Providers')}\n${list}`;
}

function saveText(args: string[]): string {
  return formatDim('Save handled async in REPL. Category: ' + (args[0] || 'brainstorm'));
}

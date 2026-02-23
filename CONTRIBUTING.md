# Contributing to AI Vault

Thanks for your interest in contributing!

## Getting Started

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure
4. Run in development: `npm run dev`

## Development

```bash
npm run dev          # Start with tsx (hot reload)
npm run cli          # CLI-only mode
npm run build        # Compile TypeScript
npm run typecheck    # Type check without emitting
```

## Project Structure

- `src/core/` - Central engine, session management, queue
- `src/providers/` - LLM provider implementations
- `src/interfaces/` - Telegram bot, REST API, CLI REPL
- `src/vault/` - Note management, search, templates
- `src/synthesis/` - Auto-synthesis and digest generation
- `src/users/` - Multi-user system

## Adding a New Provider

1. Create `src/providers/your-provider.ts`
2. Implement the `LLMProvider` interface
3. Register in `src/providers/registry.ts`
4. Add config keys in `src/config.ts`

## Code Style

- TypeScript strict mode
- ESM modules (`.js` extensions in imports)
- Minimal dependencies
- No classes where functions suffice (except for interface implementations)

## Pull Requests

- Keep changes focused and minimal
- Ensure `npm run typecheck` passes
- Update `.env.example` if adding new config
- Test with at least one interface (CLI is easiest)

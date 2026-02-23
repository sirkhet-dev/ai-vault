# AI Vault

**AI-powered knowledge vault with multi-LLM support.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.5.0-2ea043)](package.json)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://typescriptlang.org)

AI Vault combines a **Telegram bot**, **REST API**, and **CLI REPL** with a Markdown-based knowledge vault. Switch between LLM providers on the fly, save conversations as structured notes, search your vault, and get automatic weekly digests.

```
Telegram / REST API / CLI  -->  Engine  -->  LLM Providers  -->  Markdown Vault
```

## Features

- **Multi-LLM**: Claude CLI, Gemini CLI, Codex CLI, Claude API, OpenAI API, Gemini API, OpenRouter (100+ models)
- **3 Interfaces**: Telegram bot, REST API, CLI REPL - all share the same engine
- **Knowledge Vault**: Markdown notes with YAML frontmatter in 3 categories (brainstorm/active/archive)
- **Full-Text Search**: In-memory TF-IDF search across all notes
- **Auto-Synthesis**: Weekly digest generation that finds themes and forgotten ideas
- **Multi-User**: Isolated vaults per user with single-user mode option
- **Minimal Dependencies**: 8 runtime deps, ~2,900 LOC

## Quick Start

```bash
git clone https://github.com/sirkhet-dev/ai-vault.git
cd ai-vault
npm install
cp .env.example .env
# Edit .env with your tokens/keys
npm run dev
```

### CLI Only

```bash
npm run cli
```

### Docker

```bash
cd docker
docker compose up
```

## Development

```bash
npm run dev        # Run all enabled interfaces
npm run cli        # CLI-only mode
npm run typecheck  # Type validation
npm run build      # Compile TypeScript
```

## Security Defaults

- API access is blocked unless `API_KEY` is set or `API_ALLOW_ANONYMOUS=true`
- Telegram access is blocked unless `TELEGRAM_ALLOWED_USERS` is configured or `TELEGRAM_ALLOW_PUBLIC=true`
- Vault note paths are constrained to `brainstorm|active|archive` and `.md` filenames
- API enforces request body size limits and in-memory per-IP+path rate limiting

## Configuration

See [`.env.example`](.env.example) for all options. Key settings:

| Variable | Description | Default |
|----------|-------------|---------|
| `DEFAULT_PROVIDER` | LLM provider to use | `claude-cli` |
| `TELEGRAM_ENABLED` | Enable Telegram bot | `true` |
| `TELEGRAM_ALLOW_PUBLIC` | Allow all Telegram users if allowlist empty | `false` |
| `API_ENABLED` | Enable REST API | `true` |
| `API_ALLOW_ANONYMOUS` | Allow API access without `API_KEY` | `false` |
| `API_MAX_BODY_BYTES` | Maximum JSON body size accepted by API | `1048576` |
| `API_RATE_LIMIT_MAX` | Max requests per window per IP+path | `60` |
| `API_RATE_LIMIT_WINDOW_MS` | Rate-limit window size in milliseconds | `60000` |
| `CLI_ENABLED` | Enable CLI REPL | `true` |
| `SINGLE_USER_MODE` | Skip auth, use root vault | `false` |

## Providers

| ID | Type | Requires |
|----|------|----------|
| `claude-cli` | CLI subprocess | `claude` binary installed |
| `gemini-cli` | CLI subprocess | `gemini` binary installed |
| `codex-cli` | CLI subprocess | `codex` binary installed |
| `claude-api` | HTTP API | `ANTHROPIC_API_KEY` |
| `openai-api` | HTTP API | `OPENAI_API_KEY` |
| `gemini-api` | HTTP API | `GOOGLE_API_KEY` |
| `openrouter-api` | HTTP API | `OPENROUTER_API_KEY` (100+ models) |

### OpenRouter

[OpenRouter](https://openrouter.ai) gives you access to 100+ models (Claude, GPT, Gemini, Llama, Mistral, DeepSeek, etc.) through a single API key. Set the model via `OPENROUTER_MODEL`:

```env
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=anthropic/claude-sonnet-4    # default
# OPENROUTER_MODEL=openai/gpt-4o
# OPENROUTER_MODEL=google/gemini-2.0-flash-001
# OPENROUTER_MODEL=meta-llama/llama-3.1-405b-instruct
```

Browse all available models at [openrouter.ai/models](https://openrouter.ai/models).

### Switch providers at runtime

- Telegram: `/provider openrouter-api`
- CLI: `/provider claude-api`
- API: `PUT /api/v1/provider {"provider": "openai-api"}`

## REST API

All endpoints require `Authorization: Bearer <API_KEY>` by default. You can explicitly allow anonymous API access with `API_ALLOW_ANONYMOUS=true`.

```
POST   /api/v1/chat                    Send a prompt
DELETE /api/v1/session                  Reset conversation
GET    /api/v1/vault/notes              List notes
GET    /api/v1/vault/notes/:filepath    Get a note
POST   /api/v1/vault/notes              Create a note
PUT    /api/v1/vault/notes/:filepath    Update a note
DELETE /api/v1/vault/notes/:filepath    Delete a note
POST   /api/v1/vault/search             Search vault
POST   /api/v1/vault/save               Save chat to vault
POST   /api/v1/synthesize               Trigger synthesis
GET    /api/v1/providers                List providers
PUT    /api/v1/provider                 Switch provider
GET    /api/v1/status                   System status
```

### Example

```bash
# Chat
curl -X POST http://localhost:3000/api/v1/chat \
  -H "Authorization: Bearer your-key" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the meaning of life?"}'

# Search vault
curl -X POST http://localhost:3000/api/v1/vault/search \
  -H "Authorization: Bearer your-key" \
  -H "Content-Type: application/json" \
  -d '{"query": "machine learning"}'
```

## Vault Structure

```
vault/
  brainstorm/    Raw ideas, quick thoughts
  active/        Work in progress, ongoing projects
  archive/       Completed or paused items
```

Notes use YAML frontmatter:

```markdown
---
title: "My Idea"
category: brainstorm
tags: ["ai", "productivity"]
created: 2025-01-15T10:30:00.000Z
updated: 2025-01-15T10:30:00.000Z
---

# My Idea

Content here...
```

## Architecture

```
src/
  core/        Engine, session management, queue
  providers/   LLM provider implementations (7 providers)
  interfaces/  Telegram, REST API, CLI
  vault/       Note CRUD, search, templates
  synthesis/   Auto-digest generation
  users/       Multi-user system
```

All interfaces convert input to a `Prompt` object and call `engine.execute(prompt)`. The engine resolves the provider, manages sessions, and returns a `PromptResult`.

## Contributors

- [Claude](https://github.com/claude)
- [sirkhet-dev](https://github.com/sirkhet-dev)
- [Codex](https://github.com/codex)

## License

MIT

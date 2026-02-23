# Threat Model

## Assets

- API keys and bot tokens
- Vault note content
- User identity mappings and session state

## Trust Boundaries

- Telegram users -> bot interface
- HTTP clients -> API interface
- App process -> local filesystem vault
- App process -> external LLM APIs/CLI tools

## Key Threats

- Unauthorized API/Telegram access
- Path traversal to read/write files outside vault
- Prompt abuse causing excessive compute usage
- Secret leakage through logs or config mistakes
- Supply-chain risk from dependencies

## Existing Controls

- API key and Telegram allowlist checks
- Path normalization and category path constraints
- Request body and rate-limit middleware
- Typed config validation via `zod`
- CI + audit + secret scanning

## Next Hardening Steps

- Add integration tests for auth and vault path safety
- Add per-user quotas for costly provider operations
- Add optional persistent rate-limit backend for multi-instance deploys

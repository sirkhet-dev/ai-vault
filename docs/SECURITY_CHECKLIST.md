# Security Checklist

## Pre-Release

- [ ] `npm audit --omit=dev` is clean or reviewed.
- [ ] CI pipeline (`typecheck`, `build`, `audit`) is green.
- [ ] Secret scan is green.
- [ ] `.env.example` reflects current required security vars.

## Runtime

- [ ] `API_KEY` is set in production (or anonymous mode is explicitly approved).
- [ ] `TELEGRAM_ALLOWED_USERS` is configured (or public mode explicitly approved).
- [ ] `CLAUDE_SKIP_PERMISSIONS` remains `false` unless controlled environment.
- [ ] Logs are retained without exposing secrets.

## Storage and Access

- [ ] Vault path points to dedicated directory.
- [ ] Backups are encrypted and access-controlled.
- [ ] Deploy target runs as non-root user.

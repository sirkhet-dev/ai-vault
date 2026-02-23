# Security Policy

## Supported Versions

Only the latest `main/master` branch is actively supported with security fixes.

## Reporting a Vulnerability

- Do not open public issues for security-sensitive findings.
- Report findings privately to `dev@sirkhet.com`.
- Include reproduction steps, impact, and suggested mitigation.

## Security Baseline

- API authentication is required by default (`API_KEY` or explicit `API_ALLOW_ANONYMOUS=true`).
- Telegram access is deny-by-default unless allowlist or explicit public mode.
- Vault file operations are constrained to category-scoped Markdown paths.

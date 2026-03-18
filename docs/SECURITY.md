# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public issue
2. Email security concerns to the maintainers
3. Include a description of the vulnerability and steps to reproduce
4. Allow up to 72 hours for an initial response

## Security Measures

### Application Security

- All user inputs are validated using schema-based validation
- SQL injection prevention via parameterized queries (Drizzle ORM)
- XSS prevention via React's built-in escaping
- CSRF protection on all state-changing endpoints
- Rate limiting on all API endpoints

### Secret Management

- Secrets are managed via environment variables
- Vault secret rotation supported via `scripts/rotate-vault-secret.ts`
- No secrets are committed to the repository
- `.env` files are gitignored

### Dependency Security

- Automated dependency auditing via `pnpm audit`
- Weekly security scans via GitHub Actions
- Dependabot for automated dependency updates
- Container image scanning with Trivy

### Infrastructure Security

- Docker images are scanned for vulnerabilities before deployment
- Non-root container users
- Health checks on all services
- Network isolation via Docker networks

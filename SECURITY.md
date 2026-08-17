# Security policy

Only the latest published beta is supported while PHPAML Engine remains below
1.0.

PHPAML Engine runs local declarative interactions in the browser. Applications
must still authenticate, authorize and validate every explicit API request on
the server. Browser state and persisted values are never trusted input.

Do not store passwords, session tokens, private keys or personal data in local,
session or IndexedDB state. Use HTTPS, a strict Content Security Policy and
appropriate CSRF protection in production.

To report a vulnerability, use GitHub's private security advisory feature for
the repository. Do not disclose an unpatched vulnerability in a public issue.

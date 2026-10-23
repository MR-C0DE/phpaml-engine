# Security policy

Only the latest published beta is supported while PHPAML Engine remains below
1.0.

PHPAML Engine runs local declarative interactions in the browser. Applications
must still authenticate, authorize and validate every explicit API request on
the server. Browser state and persisted values are never trusted input.

Do not store passwords, session tokens, private keys or personal data in local,
session or IndexedDB state. Use HTTPS, a strict Content Security Policy and
appropriate CSRF protection in production.

Form drafts exclude password, hidden, file and disabled controls, payment and
one-time-code autocomplete fields, and controls with autocomplete disabled.
Matching sensitive values in older drafts are removed when that form restores.
Ordinary draft fields remain readable in session storage: applications must
still mark sensitive custom inputs with `autocomplete="off"` or avoid preserving
the form. State paths traverse own properties only.

API calls, remote validation and client-side page/state fetches enforce the
same-origin boundary through redirects as well as at the initial URL. External
links still use normal browser navigation. Keep authentication and authorization
on the server; this network boundary does not replace either of them.

The local security laboratory in `tests/security-lab` uses synthetic data and
loopback-only servers. Its diagnostic mode deliberately tests library boundaries
independently of CSP. It is a test fixture, not a production application.
Run `npm run test:security` with the matching View checkout and installed
Playwright browsers to verify both runtimes. `npm run test:safari:security`
uses an already enabled Safari WebDriver at `http://127.0.0.1:8121` (or
`WEBDRIVER_URL`). Both commands start and stop their own loopback laboratory.

To report a vulnerability, use GitHub's private security advisory feature for
the repository. Do not disclose an unpatched vulnerability in a public issue.

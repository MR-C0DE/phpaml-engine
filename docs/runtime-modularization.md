# Runtime JavaScript modularization

This migration is required before the first stable AML Engine release.

## Target

The PHP package must expose a versioned browser asset instead of embedding the
runtime in an inline PHP string:

```text
JavaScript modules → build/minify/source maps → engine-<version>.js
                                      ↓
                         /_aml/engine-<version>.js
```

Generated applications will load that asset with `defer`, a same-origin CSP,
immutable caching for versioned filenames, and no inline runtime script.

## Migration stages

1. **Completed in beta.2:** extract the current runtime without changing browser behavior.
2. **Completed in beta.2:** split state, effects, navigation, validation and diagnostics
   into modules. The state and computed-value primitives now live in
   `src-js/core/state.js`; persistence, migrations and IndexedDB access live in
   `src-js/storage.js`; isolated effect-runtime construction, sanitized event
   snapshots and asynchronous action analysis live in `src-js/effects.js` and
   `src-js/core/action-analysis.js`; HTTP request construction and CSRF token
   rotation live in `src-js/http.js`. All feed the reproducible runtime build.
   Synchronous form rules and control-value normalization live in
   `src-js/validation.js`.
3. **Completed in beta.2:** bundle and minify reproducibly; publish source maps
   and verify committed outputs with `npm run build:check`.
4. **Completed in beta.2:** expose a safe deferred external tag via
   `EngineRuntime::externalScript()` and make `create-view-app` publish the
   versioned asset at `/_aml` with immutable caching.
5. Keep `EngineRuntime::script()` only as a deprecated compatibility bridge.
6. Remove the bridge before the stable API is frozen.

Every stage must keep the PHP suite and Chromium, Firefox and WebKit suites
green. Generated applications now use the external versioned asset by default;
removing the deprecated inline bridge remains the final pre-stable cleanup.

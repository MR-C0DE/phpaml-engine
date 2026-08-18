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

1. Extract the current runtime without changing browser behavior.
2. Split state, effects, navigation, validation and diagnostics into modules.
3. Bundle and minify reproducibly; publish source maps in development builds.
4. Serve the versioned asset through PHPAML and update `create-view-app`.
5. Keep `EngineRuntime::script()` only as a deprecated compatibility bridge.
6. Remove the bridge before the stable API is frozen.

Every stage must keep the PHP suite and Chromium, Firefox and WebKit suites
green. The stable release is blocked until the generated application uses the
external versioned asset by default.

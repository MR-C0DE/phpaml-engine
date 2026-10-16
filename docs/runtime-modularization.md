# Runtime JavaScript modularization

The source-module extraction is complete. The browser build now also separates
the existing optional PHP families and browser capabilities from the initial Core, without changing View
components or extending PHP language support.

## Current browser modules

The ESM entry in `assets/modules-<version>.min/engine.js` imports one shared Core
and registers loaders for Unicode, Intl, BCMath, Regex, Date, SPL, Reflection,
Files, Browser APIs and Animations.
Intl depends on Unicode and Date because its existing adapter includes Normalizer
and IntlDateFormatter. The unminified build lives in `assets/modules-<version>/`.

`scripts/modular-build.mjs` defines the extraction boundaries. It reuses the
existing adapter sources and substitutes only their cross-boundary imports with
registry calls in the modular build. Object identities, array/reference metadata,
service state and lifecycle machinery stay in the shared Core. The normal source
imports and complete IIFE build keep using their original direct imports.

`src-js/modules/catalogue.json` and `callables.json` describe the existing PHP
families and callback parameters. `FrontendModules` adds dependency information
to compiled local scopes; the browser also examines reactive expressions, effects
and template contents. It never evaluates user PHP to discover dependencies.
Unknown callable targets, unpacked callbacks, callback containers and dynamic
`eval` conservatively load all seven PHP families, without loading browser capabilities. Ordinary arithmetic, strings and array
operations remain available from Core. A simple counter requires no optional
family.

Modules load before the first mount and before a navigation replaces the current
root. Actions also prepare their dependencies before any State mutation. Concurrent
loads are deduplicated and module versions must match Core. If loading fails,
navigation keeps the existing root and State; the loader reports `AML_MODULE_LOAD`.
An unmounted component cannot finish a pending mount. Loaded code remains cached
for the document, while existing component lifetimes still govern service and
static-property state. The dynamic PHP parser remains a separate optional asset
and inherits the main entry's CSP nonce and `data-aml-eval-src` override.

The browser capability boundaries reuse existing implementations:

| Module | Existing behavior | Preparation |
| --- | --- | --- |
| Files (`files`) | Local text/JSON/CSV reads, downloads, validation and cancellation | File actions, including actions in templates |
| Browser APIs (`browser`) | Application HTTP requests, CSRF, persisted State and contexts, migrations, IndexedDB, storage synchronization, form drafts and remote validation | API actions, persistence configuration and form/context attributes |
| Animations (`animations`) | Existing component transitions and page navigation fade | Transition attributes and client navigation |

The shared Core retains routing, DOM rendering, local control bindings, validation,
State and lifecycle ownership. Optional implementations are absent from its static
import graph. Template contents are scanned before they become visible. An event
waiting for a module is cancelled if its component is unmounted or recreated.

`clearPersisted()` for local/session storage and `clearFormDraft()` keep their
small synchronous compatibility bridges in Core. IndexedDB cleanup remains a
Promise and loads Browser APIs if needed. The complete IIFE retains direct
imports and all existing behavior. No browser capability or public method is added.

## Deployment and compatibility

`EngineRuntime::script()`, `assetPath()`, `assetFilename()` and the default
`externalScript()` continue to use the complete compatibility bundle.
Integrations opt in with `EngineRuntime::externalScript(modular: true)` after
publishing the modular assets. The updated CLI installer and AML Tasks example
do both together; existing component and service code needs no changes.

When an integration manually mounts newly inserted markup in modular mode,
use `await AMLEngine.mount(container)` before inspecting its State: it may need
to fetch a family that was absent from the previous page. The complete runtime
retains synchronous mounting; awaiting its return also works. Normal page
navigation and View component lifecycle handle this preparation internally.

Publish all JavaScript files and source maps from `assets/public-assets.json`
under the same public base, retaining their subdirectories. Use
`EngineRuntime::publicAssetPath($filename)` to resolve a requested suffix against
that allowlist; do not concatenate arbitrary request paths with the asset folder.
Do not publish `module-build.json` or the source catalogue through this route.
Keep hashed chunks available for already-open pages during deployment. Revalidate
the entry and complete bundle when rebuilding the same beta version; immutable
caching is appropriate only for filenames whose contents cannot change.

The build checks that optional implementations and their large tables do not
leak into the initial graph. `assets/module-build.json` records that graph and
its byte sizes. `npm run build:check` validates all complete and modular outputs.
`npm run test:browser:runtimes` runs all fixtures with both the complete bundle
and the modular graph, checking which entry was actually loaded. View is a
required test dependency, including in CI. The dedicated module suites check
selective loading, dynamic dependencies, CSP, navigation, persistence, remote
validation, reduced motion and cancellation.
`npm run test:packages` installs release-format Engine and View ZIPs with Composer
in an isolated application and repeats the application/module checks in both
modes. It also verifies every public asset and rejects missing chunks. See the
[test commands and CI configuration](../README.md#both-runtimes-and-distributed-installations).
Installed Safari is exercised separately by `npm run test:safari`.

## Earlier source extraction

## Target

The PHP package must expose a versioned browser asset instead of embedding the
runtime in an inline PHP string:

```text
JavaScript modules → build/minify/source maps → engine-<version>.js
                                      ↓
                         /_aml/engine-<version>.js
```

The original external bundle uses `defer` and a same-origin CSP. The modular
entry uses `type="module"`, which is deferred by the browser.

## Migration stages

1. **Completed in beta.3:** extract the current runtime without changing browser behavior.
2. **Completed in beta.3:** split state, effects, navigation, validation and diagnostics
   into modules. The state and computed-value primitives now live in
   `src-js/core/state.js`; persistence, migrations and IndexedDB access live in
   `src-js/storage.js`; isolated effect-runtime construction, sanitized event
   snapshots and asynchronous action analysis live in `src-js/effects.js` and
   `src-js/core/action-analysis.js`; HTTP request construction and CSRF token
   rotation live in `src-js/http.js`. All feed the reproducible runtime build.
   Synchronous form rules and control-value normalization live in
   `src-js/validation.js`.
3. **Completed in beta.3:** bundle and minify reproducibly; publish source maps
   and verify committed outputs with `npm run build:check`.
4. **Completed in beta.3:** expose a safe deferred external tag via
   `EngineRuntime::externalScript()` and make `create-view-app` publish the
   versioned asset at `/_aml` with immutable caching.
5. Preserve `EngineRuntime::script()` as a compatibility bridge. Its removal
   would require a separate breaking-change decision and is outside this refactor.

Every stage must keep the PHP suite and Chromium, Firefox and WebKit suites
green. Generated applications use the modular external entry, while existing
integrations can continue using their complete external or inline bundle.

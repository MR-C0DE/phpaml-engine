# Changelog

All notable changes follow Semantic Versioning.

## 0.1.0-beta.2 — 2026-08-17

- plan de modularisation du runtime documenté comme prérequis de la stable ;
- prise en charge du nonce CSP conservée pour le runtime inline de compatibilité ;
- transactions d’état, collections riches et effets asynchrones stabilisés ;
- renouvellement CSRF validé dans le navigateur ;
- tests reproductibles sur Chromium, Firefox et WebKit avec Playwright 1.55.1.

## 0.1.0-beta.1

- Execute declarative effects with dependency tracking and debounce.
- Clean timers, listeners and effect-owned API requests on rerun and unmount.
- Isolate effect errors, preserve current async loading state after cancellation,
  and stop rapid reactive cycles.
- Add dynamic effect runtimes, causal slow-cycle detection, IndexedDB-aware
  mounting, stale-result protection, and four concurrency strategies.
- Add safe `EventRef` values, local cleanup actions, throttling and effect
  inspection/pause/resume/manual-run development APIs.
- Add accessible modal, tabs, accordion and sortable-table behavior.
- Add keyed drag and drop, windowed virtual-list rendering and declarative
  entrance transitions.
- Add nested context resolution, theme and locale synchronization, route
  snapshots, declarative navigation and preserved navigation boundaries.
- Fix the collision between diagnostic state history and the browser History
  API, and restore focus after same-document navigation.
- Added local state actions and targeted DOM bindings.
- Added same-origin explicit API actions with lifecycle states.
- Added History API navigation and component lifecycle events.
- Added reactive visibility, classes, disabled state and collections.
- Added accessible local and asynchronous form validation.
- Added debounce, abort handling and submission-time remote validation.
- Added shared state synchronization across mounted roots and JSON-safe local
  or session persistence.
- Added isolated component namespaces, type coercion, cross-tab storage events,
  version/expiry metadata, mutation cleanup and prototype-pollution defenses.
- Added rich keyed collections, nested paths and single-render transactions.
- Added declarative storage migrations, IndexedDB, state history, inspection
  and local restoration for development diagnostics.
- Added computed dependency propagation, microtask batching, keyed DOM/state
  reconciliation, conditional branches, cycle errors and transaction rollback.

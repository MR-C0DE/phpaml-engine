# Changelog

All notable changes follow Semantic Versioning.

## 0.1.0-beta.9 — 2026-10-16

- Correct PHP 8.2/8.3 compatibility for negative array indices, Generator
  introspection and named magic-method closures; preserve live by-reference
  array traversal in ViewTest. Preserve the compiling server’s ICU default
  currency semantics for noncurrency NumberFormatter styles. Verify all three
  supported PHP versions in CI.

- coordinate distribution with CLI `1.7.0-beta.45`, View `0.1.0-beta.13` and
  Engine `0.1.0-beta.9`; the CLI release check creates a real application from
  ZIP packages and verifies its development and production runtimes.

- Extract existing Files, Browser APIs and Animations into optional browser modules. Prepare their dependencies from actions, persisted State, form/context attributes and nested templates; retain synchronous compatibility helpers and the complete runtime. Cancel events waiting for modules when their component unmounts. Cover isolated loading, failures, persistence, drafts, validation, transitions and distributed applications without adding public APIs.

- Automate the complete and modular browser suites with mandatory View fixtures and runtime-selection checks. Add isolated Composer ZIP installation checks, public-asset and missing-chunk validation, and installed application journeys on Chromium, Firefox and WebKit. Preserve reports, traces and candidate archives in CI without changing runtime features or public APIs.

- Split the existing Unicode, Intl, BCMath, Regex, Date, SPL and Reflection implementations into versioned, on-demand browser modules sharing one Core. Preserve the complete assets and default PHP integration APIs; activate the modular entry in the CLI and AML Tasks integration. Resolve dependencies before mount, navigation or action mutations, preserve CSP nonces, and cancel pending component mounts on unmount. Add PHP/browser dependency and compatibility coverage without expanding the supported language or component catalogue.

- Stabilize cross-browser verification: serve a local favicon in CSP fixtures without relaxing script restrictions, account for the browser's Japanese yen symbol while retaining PHP numeric expectations, read actual console-error arguments instead of protocol previews, cap browser-test concurrency, and allow simultaneous requests in PHP test servers. Add an installed-Safari WebDriver runner for the three complete application examples.

- Add real AML Tasks browser journeys covering validation, duplicate titles, shared State, history, persistence, locale/theme navigation, missing routes and runtime cache revalidation. Serve the sibling example alongside the existing browser fixtures when available.

- Evaluate View constructor projections in isolated object catalogues and budgets, keeping event service state separate. Preserve scalar model types for forwarded array form fields; cover parent writes, sibling isolation, direct construction, hooks and recovery in CSP browser tests.

- Preserve reactive dependencies through mutable local calculations and view helper arguments; support mixed variadic spreads and identifiable callable factories. Keep failed display values and expose located render diagnostics in ViewTest. Add ten ctype functions and five hash helpers, with PHP differential and CSP browser coverage.
- Extend seven frontend language areas: dynamic operands and symbols, seeded random generators, bounded advanced regex, dates/Intl/Unicode validation, reference destructuring/generators/properties, hooks/reflection/serialization/SPL, and named eval classes/enums/namespaces. Add native differential and CSP browser coverage and document exact adapter limits in View's extensions-langage guide.

- Add URL/Base64 codecs and filter_var_array; support grapheme operations, Unicode normalization and a bounded NumberFormatter adapter. Interpret dynamic class targets and full nullsafe receiver chains in compiled events, eval and generators. Add differential and CSP browser tests with a combined profile example in View.

- Align dynamic eval bitwise assignments with compiled events, including single target evaluation, reference writes, invalid operands and integer result metadata.
- Interpret JsonSerializable hooks with PHP error semantics, add supported createFromFormat diagnostics, DateInterval arithmetic and DatePeriod traversal, plus closed-catalogue callable and filter_var adapters. Verify the combined flow through View's reservation example, native differential tests and CSP browser scenarios.
- Compare DateTime and DateTimeImmutable by timestamp and microseconds across timezones, including array searches and regular sorting, instead of comparing empty opaque fields; require explicit fields or identity for other adapted date objects.
- Add modular JSON, bounded PCRE and date adapters, including opaque stdClass and DateTime values, PHP flags/errors and explicit browser parsing limits; exercise the families together in a real View example.
- Add ArrayIterator/ArrayObject, iterator_* helpers, Traversable unpacking and reference cells for aliases, referenced arrays, foreach and reference returns; detach State transaction snapshots from live cells.
- Interpret compiled user enums, additional logical/bitwise operators, static function locals, argument introspection, computed method dispatch and method array/string callables. Keep static lifetimes component-scoped.
- Use View's generated compatibility catalogue as the documentation entry point and remove outdated exclusions from the runtime overview.

- Interpret lazy generators (`yield`, `yield from`) in services, closures and eval, including suspended expressions, send/throw/getReturn, typed keys and bounded resumption across component clicks. Preserve console output, State rollback and PHP source diagnostics; add differential and CSP browser tests and a French catalogue example. Automatic garbage-collection finalization remains outside the frontend contract.

- Interpret Iterator/IteratorAggregate foreach in browser events and service functions, with Traversable/iterable contracts, is_iterable (290 native helpers), lazy traversal, typed keys, control flow and bounded delegation. Validate anonymous interface contracts and preserve rollback, source diagnostics and console behavior; add native differential tests, browser coverage and a French example/guide.

- Support Countable and ArrayAccess service collections, count/sizeof/is_countable (289 native helpers), offset reads/writes, quiet access, destructuring and reference semantics. Preserve PHP indirect-write notices and argument evaluation; add differential tests, CSP browser coverage and a French shopping-cart example/guide.

- Add twelve scope-aware object introspection builtins (288 native functions total) and __debugInfo console views. Preserve inherited visibility, method spelling/order, aliases, named/spread arguments, callbacks and eval; normalize debug hook failures into catchable frontend errors. Add differential tests, CSP browser coverage and a French example/guide.

- Remove component event listeners on unmount so remounting cannot duplicate clicks or consume a fresh service counter twice.

- Support anonymous frontend classes and intersection/DNF type contracts, with constructors, typed/promoted properties, inheritance/interface validation, component-scoped statics and fresh anonymous identities per eval. Add differential PHP/ViewTest/Engine tests and browser coverage.

- Implement nine service magic methods for properties, instance/static method dispatch, invokable objects, Stringable conversions and cloning. Preserve visibility, strict types, named arguments, indirect-write notices, recursion guards and readonly clone behavior; add native differential tests, browser coverage and a profile example.

- Support typed service static properties with self/parent/late-static access, inheritance, visibility, references and eval. Keep storage isolated per component across handlers; reset on component recreation and retain static side effects after event errors. Add native PHP/ViewTest/Engine comparisons and Chrome lifecycle coverage.

- Compile and interpret local service objects: constructors, typed/readonly properties, visibility, inheritance, interfaces, traits, static dispatch, method closures, shallow cloning and existing-class eval. Preserve identity and float metadata, reject object State, and verify native PHP/ViewTest/Chrome behavior.

- Interpret eval instructions with shared execution budgets and load a separate PHP parser on demand under strict CSP; preserve scope, conditional declarations, traces and State rollback. Ship the parser asset and license.

- Add print_r/var_export (276 native functions total), bounded PHP-compatible scalar/array formatting, console output and pure string returns, with native callbacks and browser parity tests.

- Add all 14 procedural BCMath functions (274 native functions total), exact bounded decimal arithmetic, eight bcround modes, typed local RoundingMode values and event-local bcscale; verify native PHP parity, pure reactive totals, source diagnostics and error rollback.

- Add 28 UTF-8 mbstring functions (260 native functions total), deterministic PHP-generated Unicode tables, bounded code-point operations, named arguments and native callbacks; verify PHP/ViewTest/Engine parity and reactive browser updates with accents and emoji.

- Expand the native catalogue to 232 math, string, array and scalar helper functions; share reflected signatures, named/spread/reference arguments and native callbacks across ViewTest and Engine. Separate runtime modules, retain pure reactive display rules, add differential PHP tests and a browser example.

- Execute PHP exception hierarchies, catch/finally flow and assertions across event/function frames; preserve identity, previous causes and PHP traces, reject Throwable objects in State and enrich development diagnostics without enabling production overlays.

- Add bounded UTF-8 text/JSON/CSV file actions, typed result/error/loading states, cancellable latest reads, safe CSV exports and Blob downloads without network requests; test real View imports, persistence and downloads in Chrome. Make PHP array key reconciliation linear for imported datasets.

- Evaluate reactive display expressions in isolated read-only function frames with call/loop budgets and PHP source diagnostics; render scalar text with PHP boolean/null/numeric conversion. Verify native View components through hydration and successive browser updates.

- Execute a closed set of 25 PHP string, validation and numeric builtins, preserving byte semantics, references, numeric kinds and strict/weak argument contracts; use secure browser randomness and bound string growth.
- Correct negative rounding ties and amount formatting, including high precision and PHP version differences; test input, console output, error rollback and exact cent calculations in Chrome.

- Execute compiled functions with private frames, typed arguments/returns, named/default/variadic parameters, reference aliases and closures; bound recursion and cumulative calls and retain PHP service locations and call stacks.

- Execute structured control flow with loop budgets and rollback; preserve PHP array keys, insertion order, numeric kinds and copies across callbacks and persistence; support console-only echo.

- Evaluate PHP operators with numeric kind-aware comparisons, lazy branches and single-evaluation mutations; report arithmetic failures with PHP source locations.
- Validate typed state assignments before mutation, preserve numeric kinds, and restore both on synchronous transaction failure.
- Retain scalar PHP numeric kinds across transactions, shared state and persisted state restoration.
- Attach PHP source locations to runtime errors; emit structured `aml:warning` diagnostics for implicit conversion warnings.
- execute private handler-local frames and copy assignments without leaking
  locals into state, persistence, or another invocation;
- preserve scalar type information for local float values and implement
  `gettype()` and PHP-style scalar `var_dump()` in the browser console;
- align boolean, numeric-prefix and string casts with PHP, including `"0"`,
  boolean concatenation, UTF-8 lengths and float formatting;
- add a new versioned runtime for the extended View/Engine protocol.

## 0.1.0-beta.8 — 2026-10-13

- initialize Engine when another script has reserved `window.AMLEngine` without
  providing a working `mount()` implementation;
- preserve the duplicate-runtime guard when a complete Engine instance is
  already mounted;
- cover this browser-global collision with a regression test.
- display browser, promise, rendering, effect, storage and client-action errors
  in a development-only full-screen overlay;
- keep the overlay disabled unless the server explicitly emits `aml-debug`.

## 0.1.0-beta.7 — 2026-10-13

- execute keyboard, mouse and drag-and-drop handlers with a restricted browser
  event payload;
- add safe PHP-compatible search, key inspection, null checks, numeric bounds,
  rounding and scalar conversion expressions;
- extend collection actions, bounded loops and asynchronous request execution
  while preserving the no-`eval`, same-origin runtime contract;
- validate the runtime on Chromium, Firefox and WebKit.

## 0.1.0-beta.6 — 2026-10-12

- extend safe state expressions with multiplication, division and modulo;
- add safe string concatenation and boolean negation expressions;
- allow conditional actions to compare safe state expressions;
- add safe conditional values for PHP-style ternary expressions;
- add `choose()` for concise conditional values in reactive view output;
- add `prefixedBy()` for readable prefix-first reactive concatenation;
- support negative `remove-at` indexes so `-1` consistently removes the final item;
- reject division and modulo by zero in the browser runtime.
- add action-state execution with automatic pending, success, and error
  transitions for synchronous and asynchronous client actions;
- add tracked native-form lifecycle state, submission errors, validation
  synchronization and reactive reset behavior;
- add CSP-safe, allowlisted element-reference operations for focus, selection,
  and native media playback controls;

## 0.1.0-beta.5 — 2026-10-07

- add safe arithmetic state expressions through `StateRef::plus()` and
  `StateRef::minus()`;
- evaluate expressions from an explicit operation allowlist without `eval` or
  executable client code;
- allow `set` actions to derive their next value from current reactive state.

## 0.1.0-beta.4 — 2026-09-26

- add typed, declarative browser-console actions without inline JavaScript;
- keep native `progress` and `meter` element properties synchronized with
  reactive state updates;
- validate the new behavior on Chromium, Firefox and WebKit;
- document the client action and reactive native-element contracts.

## 0.1.0-beta.3 — 2026-08-24

- runtime navigateur extrait en modules JavaScript maintenables ;
- assets versionnés, minifiés et accompagnés de leur source map reproductible ;
- chargement externe différé et compatible avec une CSP stricte ;
- pont inline et prise en charge du nonce CSP conservés pour la compatibilité ;
- tests unitaires JavaScript ajoutés pour l’état, le stockage, les effets, HTTP
  et la validation ;
- chargement des assets minifiés validé sur Chromium, Firefox et WebKit.

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

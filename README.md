# PHPAML Engine

> Distribution note: release archives contain the current versioned runtime
> and its source map. Older versioned bundles may remain in the Git history for
> auditability, but are excluded from new distribution archives.

> The modular runtime and the complete compatibility bundle share the same
> implementations. See [runtime modularization](docs/runtime-modularization.md)
> for the module boundaries and deployment contract.

`phpaml/engine` is the client-side execution engine for AML View. It owns local
state, local actions and targeted bindings in the browser. Local interactions
do not contact the PHP server.

The coordinated frontend candidate pairs Engine `0.1.0-beta.10`, View
`0.1.0-beta.14` and CLI `1.7.0-beta.46`. The CLI distribution check installs
their ZIPs into a newly generated application and verifies its production
archive with both runtimes. Versions remain independent; Engine has no CLI
or Framework dependency.

The complete runtime remains available as `assets/engine-<version>.js`, with a
minified build and source map. `EngineRuntime::script()`, `assetPath()` and the
default `externalScript()` keep their existing behavior. Older versioned assets
may remain in Git history but are excluded from current release archives.

Updated application integrations use `EngineRuntime::externalScript(modular: true)`.
Its ES module entry loads a shared Core and only the optional modules required
by the compiled page: Unicode, Intl, BCMath, Regex, Date, SPL, Reflection, Files,
Browser APIs and Animations. Files contains existing local imports/downloads;
Browser APIs contains application requests, persisted State/contexts, form drafts
and remote validation; Animations contains existing component and navigation transitions.
The View component API and supported PHP behavior are unchanged. Dynamic callable
targets and dynamic `eval` conservatively require all seven families; the PHP
parser itself still loads only when dynamic `eval` runs. Those PHP dependencies
do not request Files, Browser APIs or Animations. The router, reactive DOM and
ordinary form bindings remain in Core; navigation loads Animations before replacing
the current page. No application API changes are required.

Serve the complete build's JavaScript files and source maps under the same public
base, preserving subdirectories. `EngineRuntime::publicAssetPath($filename)`
resolves only allowlisted build outputs, returning `null` for unknown paths.
The updated CLI installer and AML Tasks example provide this route. Keep the
complete bundle when upgrading existing deployments that only expose its old URL.

The first beta supports local actions, explicit API requests, navigation,
lifecycle events, reactive presentation, collections, form bindings and
accessible synchronous or asynchronous validation. AML View remains the
public declarative API and installs this package as an internal dependency.

Form controls can use `data-aml-model` to update state locally. The engine
immediately refreshes every matching `data-aml-bind` element without a network
request.

The client router intercepts same-origin links, fetches the next server-rendered
document, replaces only the AML application root, updates active links and uses
the browser History API. External links, downloads and links explicitly marked
for native navigation are left untouched.

Backend communication is explicit through `Api::get()`, `post()`, `put()`,
`patch()` and `delete()`. API actions are restricted to same-origin paths and
can bind their loading, result and error values to client state. Ordinary local
actions never pass through this request client.

Local file operations use `BrowserFiles::readText()`, `readJson()` and `readCsv()`
with `->storeIn('data')->errorIn('error')->loadingIn('loading')`. View's
`FileInput` supplies a user-selected file; a named source is scoped to its
component. Downloads use `BrowserFiles::downloadText($value, 'notes.txt')`,
`downloadJson()` or `downloadCsv()`, with `StateRef` / expressions for current
state. No HTTP request or server filesystem access is involved.

Files use UTF-8, with a 1 MiB default limit adjustable by `maxBytes()` up to
16 MiB. CSV imports return lists of string cells; exports protect formula-like
text by default (`spreadsheetSafe(false)` opts into raw values). JSON rejects
unsafe integers, reserved prototype keys and oversized/deep data. Reads cancel
when superseded or when their root unmounts; invalid imports retain prior data.
File inputs bound to state retain only metadata and are never assigned a value
during rendering. `aml:file-success` reports a completed read or a triggered
download; `aml:file-error` reports failure. Compose with `Actions::sequence`;
file actions are rejected inside explicit state transactions and effect cleanup.

Every AML root emits `aml:mount`, `aml:update` and `aml:unmount`. The public
`AMLEngine.on(root, phase, handler)` helper returns a disposer that is called
automatically during unmount. In-flight API requests use `AbortController` and
are cancelled when navigation removes their page.

`Actions::sequence()` executes instructions in declaration order and awaits API
instructions before continuing. `Actions::when()` selects a `then` or
`otherwise` instruction using `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `truthy`
or `falsy` against current client state.

Reactive presentation bindings update visibility, CSS classes and disabled
state whenever their referenced value changes. They are evaluated during the
initial mount and after every local, form or API state update.

Reactive collections support `append`, `prepend`, `removeAt`, `removeBy`,
`updateBy`, `filterBy`, `sortBy`, `move`, `reverse` and `clear` local actions.
`merge` updates part of an object without replacing its other properties. Nested paths such as
`profile.address.city` and `tasks.0.title` are reactive. State references inside
action values are resolved at click time. List nodes are rebuilt safely with
`textContent`, never raw HTML.

State references also support safe arithmetic expressions. A `set` action can
derive its value from current state without embedding PHP or JavaScript code:

```php
ClientAction::set('count', StateRef::to('count')->plus(1));
ClientAction::set('count', StateRef::to('count')->minus(1));
```

Engine evaluates only its explicit instruction set. Explicit PHP `eval()` text is
translated to that instruction set; JavaScript source is never evaluated.

`Actions::transaction()` groups several state changes into one browser render
and emits one `aml:transaction` event containing the changed paths. Failures
restore the original snapshot and emit `aml:transaction-error`. This avoids
intermediate UI states when several related values must change together.

Local-only `Actions::sequence()` instructions are batched automatically in one
microtask render. Computed manifests propagate `concat`, `sum`, `count`, `all`
and `any` values from explicit dependencies. Twenty guarded passes prevent a
malformed computed graph from looping indefinitely.

For development tools, `AMLEngine.inspect(root)` returns an isolated snapshot
of the current frontend state without exposing the mutable internal object.
`AMLEngine.history(root)` retains the latest 100 snapshots and
`AMLEngine.restore(root, index)` restores one without contacting the server.

Persistence supports local storage, session storage and IndexedDB. Versioned
objects can declare deterministic `rename`, `defaults` and `remove` migrations.
The engine reports missing, newer, expired or corrupt data through explicit
`aml:storage-*` events and keeps the server-rendered fallback state usable.

The reproducible browser fixture in `tests/browser-fixture.php` covers nested
transactions, custom collection templates, multiple AML roots, history and
restore, IndexedDB migrations, corrupt storage and live cross-tab updates.
Playwright executes the critical interaction, transaction and CSRF scenarios
in Chromium, Firefox and WebKit on every CI run.

Browser tests use one worker locally (two in CI) to limit memory pressure.
The PHP test servers use two workers so speculative Firefox/Safari connections
cannot stall other requests. CSP fixtures declare a local transparent favicon and
allow only same-origin images; script restrictions and violation assertions remain active.
The Japanese yen symbol follows the browser's ICU/CLDR data (`¥` or `￥`);
its formatting test retains PHP's expected amounts, grouping and rounding.
Console-error tests inspect the logged error object because Firefox's protocol
preview may contain only `Error` rather than its message.

`npm run test:safari` additionally exercises the installed Safari through Apple's
WebDriver, rather than Playwright's WebKit build. Enable Safari's **Allow remote
automation** setting (macOS may require the owner's authentication), then start
these two servers from the Engine checkout in separate terminals:

```sh
PHPAML_BROWSER_RUNTIME=modules PHP_CLI_SERVER_WORKERS=2 php -S 127.0.0.1:8120 -t ../phpaml-view/examples/aml-tasks/public tests/task-app-router.php
safaridriver -p 8121
```

Run `PHPAML_BROWSER_RUNTIME=modules npm run test:safari` in another terminal.
Repeat with `PHPAML_BROWSER_RUNTIME=full` on both the PHP server and test runner
to check the complete runtime. It checks tasks, reservation and
catalogue workflows, including persistence, navigation and error recovery, and
closes its automation session afterward. The sibling View checkout is required.
`PHP_BINARY`, `AML_TASKS_URL` and `WEBDRIVER_URL` override the local defaults.
The runner waits for layout after scrolling before issuing native Safari clicks.

`npm run test:safari:nesting` starts its own local fixture server and checks both
runtimes with the installed Safari. Only `safaridriver -p 8121` is required in
advance. It compares nested conditions, mixed loops, multi-level break/continue,
function calls and finally blocks with native PHP, including limit diagnostics,
State rollback and recovery. The report is saved to
`test-results/nested-control-final/safari.json`. The Engine and View workflows
also run this check on macOS, alongside the existing Playwright and package jobs.

### Both runtimes and distributed installations

Check out the matching `phpaml-view` revision beside `phpaml-engine`, then run:

```sh
npm ci
npx playwright install chromium firefox webkit
npm run test:browser:runtimes
npm run test:packages
```

The first command pair prepares the test tools. `test:browser:runtimes` runs the
entire browser suite with the complete bundle and then the modular graph.
`npm run test:browser` runs one mode (`PHPAML_BROWSER_RUNTIME=full`, the default,
or `modules`). All application, PHP parity, reactive binding and CSP fixtures
honor this selection, and the harness checks which runtime actually loaded.
Missing View fixtures fail collection instead of silently skipping coverage.
PHP 8.4 with `mbstring`, `bcmath` and `intl` is used for the complete browser matrix.
The dedicated `modules.spec.mjs` also checks selective loading, shared Core
identity, navigation failures, nonce-only CSP and cancellation during loading.

`test:packages` requires Composer and Git. It creates release-format ZIPs from
the current tracked and non-ignored files in both checkouts, respecting
`.gitattributes` export rules without changing either Git index. Composer installs
those ZIPs into an isolated application with Packagist and network access disabled.
The check verifies Composer autoloading, every public asset and module import,
rejects an intentionally removed chunk, then runs tasks, reservations, the
compatibility catalogue and PHP module examples from the installed packages in
both modes and all three browser engines. It also requests every distributed
public asset through the application's real asset route. No package is published.

Use `npm run test:packages -- --install-only` for the installation checks alone;
`-- --project=firefox` restricts either runner to one browser. `PHPAML_VIEW_ROOT`,
`PHP_BINARY`, `CHROMIUM_EXECUTABLE_PATH`, `PHPAML_TEST_PORT` (8097) and
`PHPAML_TASKS_PORT` (8120) override local paths and ports. `COMPOSER_BINARY`
selects the Composer executable for package tests. Reports, failure traces and
the candidate ZIPs are saved under `test-results/`.

Engine CI runs the full browser suite in a two-runtime, three-browser matrix,
plus isolated Composer installation jobs. View CI also runs the installed
application checks when View changes. Both workflows check out their counterpart
repository; `PHPAML_VIEW_TEST_REF` (Engine repository variable) and
`PHPAML_ENGINE_TEST_REF` (View repository variable) select a coordinated branch,
tag or commit, defaulting to `main`. Changes spanning both repositories must use
matching revisions. CI retains test reports and distribution archives for seven days.

For same-origin mutations, Engine reads the token from
`<meta name="csrf-token" content="…">`, sends it through `X-CSRF-Token`, and
updates the meta element when the response provides a renewed token in the
same header. GET requests never receive this header.

Deployments should prefer `EngineRuntime::externalScript()`, which loads the
same-origin versioned asset without requiring `unsafe-inline`. Applications
still using the compatibility bridge may pass a validated request nonce to
`EngineRuntime::script($nonce)`.

## Effects runtime

The engine consumes effect manifests generated by `#[Effect]`. It schedules
one-shot actions, debounced dependency reactions, timeouts, intervals and
window/document listeners. Every effect owns its timers, listeners and abort
controllers, so rerunning or unmounting performs deterministic cleanup. Effect
errors are isolated and observable through `aml:effect-error`; rapid reactive
cycles are stopped and reported through `aml:effect-cycle`.

Async effects support `latest`, `exhaust`, `queue` and `parallel` scheduling.
The default `latest` strategy aborts stale requests and prevents their results,
errors, or loading cleanup from modifying the current execution. Dynamic keyed
components own isolated runtimes, and diagnostic state restoration reruns the
dependencies it changed.

Listener actions may consume sanitized event snapshots through `EventRef`.
Plans support local declarative cleanup and dependency triggers support
`throttle`. `AMLEngine.effects()`, `pauseEffect()`, `resumeEffect()` and
`runEffect()` provide copied diagnostics and explicit development controls.

## Rich component runtime

The engine enhances AML View’s rich manifests entirely in the browser. It
opens and closes native dialogs, traps modal focus, implements keyboard tabs
and accordions, updates ARIA state, and sorts data tables locally. Keyed lists
can be reordered with drag and drop without a server request.

Virtual lists calculate a bounded visible window from scroll position, row
height, viewport height, and overscan. Newly inserted elements may use
declarative fade, slide, or scale transitions through the Web Animations API.
All behavior is scoped to the mounted AML root.

The initial virtual window remains server rendered. A `ResizeObserver` refreshes
visible windows when their viewport changes. Drag payloads are bound to their
source collection, keyboard moves use `Alt+ArrowUp` and `Alt+ArrowDown`, table
sort state stays local to its table, and animations honor reduced motion.

## Context and navigation runtime

Nested context providers are resolved locally and can follow reactive state or
persist through local storage. Theme and locale contexts synchronize the root
document. `AMLEngine.context()` returns a copied context value and
`AMLEngine.route()` exposes an immutable path, query, and hash snapshot.

Declarative navigation supports push and replacement history, same-origin
fetching, loading/error/not-found boundaries, active links, title updates,
focus restoration, scrolling, and reduced-motion-aware transitions. Unsafe URL
schemes are rejected, and external HTTP(S) destinations use native navigation.

## Frontend variables and types

Engine beta.9 consumes View beta.13 local scopes and assignments. Each handler
invocation owns an isolated frame; assignments copy values and preserve scalar
PHP type information without exposing locals in `AMLEngine.inspect()`.
`gettype` expressions and console `dump` instructions consume that metadata.
Scalar conversions follow PHP zero-string, boolean, null and numeric-prefix
rules. Integer literals and casts must fit JavaScript's safe integer range.

## Frontend operators

The same beta.9 runtime supports scalar arithmetic (including `%` and `**`),
compound assignments, pre/post increments, PHP strict and loose comparisons,
logical operators, ternaries and null coalescing. Conditional operands are lazy:
an unused branch neither mutates state nor raises an arithmetic error. Expression
assignments use the same typed property checks as ordinary state updates.
Synchronous action sequences restore state on failure and report the original
PHP source location. Native PHP parity tests in View cover operator precedence
and scalar comparison rules; Engine tests also exercise browser events and bindings.

## Conditions, loops and PHP arrays

Engine beta.9 also evaluates structured switch/match, empty/isset, dynamic loops,
local foreach bindings and destructuring. Compiled loops are limited to 1,000
iterations each and 10,000 cumulative iterations per invocation. Synchronous
failures restore state and allow subsequent events. Echo uses the browser console.
`PHP_LOOP_LIMIT` identifies whether a single loop (`limitKind: "loop"`) or the
shared execution budget (`limitKind: "execution"`) was exhausted. The message
includes the allowed count and the PHP source file/line. Function, generator and
iterator execution use the same guard; the limits are unchanged.
The permanent nested-flow suite checks 128 nested conditions and 64 nested loops.
These are tested depths, not a promise of unlimited nesting: View still rejects
compiled payloads exceeding 512 nested JSON containers, with a source diagnostic.
PHP arrays keep insertion order, key types, numeric element kinds and their next
append index in internal metadata. Copies, callback results and persisted values
retain that metadata while public state remains ordinary JSON-compatible data.

## Compiled PHP functions

View can attach a closed function table to a local scope. Engine invokes these
instructions synchronously with private frames, PHP argument binding, scalar
and array contracts, reference aliases, closures and return propagation. It does
not invoke PHP or JavaScript eval. Callables remain local and cannot enter
component state or persistence. Calls are limited to 128 nested frames and
10,000 total calls per event; loops retain their own budgets. Function failures
retain PHP source locations and a `phpStack`, and synchronous event transactions
restore state before a later event runs.

## PHP exceptions and diagnostics

Compiled `try/catch/finally` works in events and synchronous function frames,
including union catches, throw expressions, rethrows and return/loop control.
Throwable values retain identity, hierarchy, code, previous causes and PHP call
frames. Standard constructors and inherited custom exceptions are supported;
custom exception methods/properties are not. Ordinary service object construction
is described in the local service objects section below.
Store message/code/trace data in State, not the Throwable object.

Caught failures retain earlier State changes; uncaught synchronous event errors
restore State through the existing transaction mechanism. Console output remains
visible. Source-aware exceptions include PHP file/line and compiled function
frames in the development overlay, with previous causes and the browser stack.
The overlay requires `aml-debug=true`; production still exposes console errors
and diagnostic metadata. Assertions follow the PHP settings at View compilation,
independently of the debug overlay. There is no server logging or PHP handler
installation from these browser instructions.

## PHP strings, numbers and input

The `builtin` expression invokes the closed native catalogue, including string,
validation and numeric functions. Arguments preserve PHP types, evaluation order, named/spread binding
and replacement-count references. UTF-8 byte operations reject invalid partial
characters; rounding and amount formatting respect PHP version metadata.
`random_int` uses browser cryptographic randomness with unbiased inclusive bounds.
Output limits prevent oversized string expansion and formatting.

Browser input uses controls, state and events. Standard process streams, blocking
terminal reads, command-line arguments and process exit codes belong to PHP CLI;
View reports these uses explicitly when compiling a browser event. Echo remains
console-only. See the View levels 7–8 guide and examples for validation, menus and
exact integer-cent calculations.

## Native PHP functions

The closed registry in `src/BuiltinFunctions.php` is the source of truth for native
functions and aliases. View's `docs/fr/compatibilite.md` contains a generated list.
Browser implementations live in separate Math, String, Array,
formatting, codec, Unicode, decimal and object-introspection modules. Generate signatures with PHP 8.4 using
`php scripts/export-builtins.php`; refresh checked-in HTML tables with
`php scripts/export-entities.php`. Refresh the Unicode tables with PHP 8.4 + mbstring using
`php scripts/export-unicode.php`. Generators run build tooling only.

Arguments retain PHP names, defaults, reference bindings and scalar types; native
callbacks share the closed function dispatcher. UTF-8 strings, safe integers,
finite State values and bounded work remain required. Locale/server functions,
dynamic variable tables, legacy encodings and the object-oriented BcMath\Number API are outside this
catalogue. The View guide documents the detailed per-family limits.

The 28 `mb_*` functions use checked-in PHP 8.4.11 casing, width and whitespace
tables. UTF-8 is the only supported encoding. Positions count code points, not
grapheme clusters; `mb_strcut` retains byte offsets. Global encoding changes,
request-wide validation, transcoding and mbregex are excluded. The source PHP
version controls contextual sigma (PHP 8.3+); older Unicode data versions may
differ on recently assigned characters. Runtime limits and PHP source diagnostics
apply to Unicode calls, including native callbacks and pure reactive text.

The 14 procedural BCMath functions use signed BigInt coefficients and decimal
scales internally, returning strings (or integer comparisons / divmod arrays).
RoundingMode values are closed, opaque local enum values for bcround. Default
scale is captured from PHP; bcscale changes stay inside the current event and
are forbidden in reactive text. Limits: 4096 operand digits, scale 0–1000,
rounding precision ±1000, bcpow exponent ±10000, 16384 intermediate digits and
the shared native work budget. No float conversion or server request is used.

`print_r` and `var_export` write to the browser console, or return strings with
`return: true` for pure reactive display. Formatting preserves PHP array order,
scalar types, escaped export literals and bounded output. Opaque exception and
closure internals are explicitly rejected. See View’s output guide.

### PHP eval

`eval` instructions share the current local/reference frame, isolate their return,
and reuse the function/loop/native budgets. Static programs arrive compiled from
View. Dynamic strings load the separate versioned `engine-eval` asset before the
event mutates State. Serve `EngineRuntime::evalAssetPath()` beside the main script
under `EngineRuntime::evalAssetFilename()` (default `/_aml/`). Inline integrations
can set `data-aml-eval-src` to another same-origin URL. No unsafe-eval CSP allowance
is needed; the parser translates PHP to closed instructions. Source is bounded to
64 KiB and AST depth to 128. This covers Engine's procedural subset, not server
facilities or arbitrary PHP classes. Declarations live in the mounted component's
function registry and are not persisted to storage.

The optional parser bundle includes php-parser 3.7.0 (BSD-3-Clause); its notice is
in [assets/licenses/php-parser.txt](assets/licenses/php-parser.txt).

### Local service objects

Local scopes may carry a closed `classes` catalogue alongside their function table. Opaque instances retain identity in PHP array copies, enforce property/method visibility and types, and support constructors, promoted/readonly properties, inherited and static methods, bound closures and shallow clones. Object operations use the existing source diagnostics and event rollback. Service instances never enter State or persistence. Dynamic eval can use already-compiled classes. Class graphs are limited to 64 definitions and event allocations to 10,000; function and loop budgets also apply. Static properties, supported magic methods and anonymous classes are described below. Internal classes require an explicit frontend adapter; dynamic properties and object serialization are not generally available.


Service static properties use component-local memory across events. The compiled
`LocalScope` carries a `serviceScope` and the declared class catalogue; Engine
retains static fields and their required function/class definitions until that
component is recreated. Inherited fields share storage by declaring class;
redeclared fields are distinct. Typed fields, visibility, reference arguments,
late static binding and known-class eval use the same checks as service objects.
Static writes are not State transactions and survive later event failures. A
`data-aml-service-scope` template identifies component lifetime, including
stateless components in dynamic lists and conditions. Static values never enter
persistence or `AMLEngine.inspect()`.


Service magic dispatch supports property overloading (`__get`, `__set`, `__isset`,
`__unset`), missing/inaccessible method calls (`__call`, `__callStatic`), callable
objects (`__invoke`), `Stringable` conversions (`__toString`) and clone hooks
(`__clone`). All implicit calls share the ordinary function budgets and error
metadata. Overloaded array properties returned by value detach indirect writes
and report a notice. By-reference getters use the shared reference mechanism.
Serialization hooks and destructors remain excluded.

Anonymous declarations use the closed object catalogue, including in optional eval. Intersection types require every class/interface in each `&` group; DNF unions preserve alternatives. Eval-created classes have fresh identities and retain their methods when returned. Class/function budgets apply to the cumulative component catalogue.

### Object introspection and debug views

Native helpers inspect compiled service objects, interfaces and enums in events: class and parent names, existence, inheritance, declared members and accessible properties/methods. Names discovered dynamically must already belong to the compiled catalogue; no autoload runs. `var_dump()` invokes `__debugInfo()` with the usual call budgets, cycle detection and console-only output. Invalid debug results throw TypeError; exceptions from the hook propagate as catchable event errors. Internal classes follow their adapter contracts rather than reflecting server objects. See View’s `docs/fr/introspection.md` and `examples/introspection/`.

### Collection objects

Compiled services can implement `Countable` and `ArrayAccess`. `count()`/`sizeof()`
dispatch to the interpreted method; `is_countable()` accepts arrays and Countable
objects. Offset operations dispatch to offsetGet/Set/Exists/Unset, including quiet
reads, compound writes and destructuring. Indirect writes to values returned by
value issue PHP notices without rewriting the element; argument unpacking uses a
copy. Contracts, errors, call budgets, numeric kinds and State rollback remain in
force. Collections stay local to events. See View's `docs/fr/collections.md` and
`examples/collections/`. Compiled Iterator/IteratorAggregate objects support foreach; see the iterator section below.

### Iterators

`foreach` consumes compiled `Iterator` and `IteratorAggregate` services lazily,
including in synchronous functions and eval. It preserves PHP method order,
key/value types, nested traversal and break/continue/return semantics. `iterable`,
`Traversable` and `is_iterable()` recognize these services. Loop and call budgets
still apply; aggregate delegation is capped at 128 levels. `ArrayIterator`,
`ArrayObject`, `iterator_to_array`, `iterator_count`, `iterator_apply` and
Traversable argument/array unpacking extend this traversal model. See View's
`docs/fr/iterateurs.md`, `docs/fr/spl-references.md` and `examples/iterateurs/`.

### Generators

Generator functions return opaque local values and suspend at `yield`/`yield from`.
The runtime supports expression suspension, manual iteration, `send`, `throw`,
`getReturn`, try/catch/finally and component-scoped static persistence. Every resume
uses the current event budgets. Generators cannot enter State; abandoned frames
do not run PHP garbage-collection finalizers. See View’s `docs/fr/generateurs.md`
and `examples/generateurs/`.

### JSON, regular expressions and dates

JSON functions preserve PHP numeric kinds, flags and error state; decoded objects
use opaque `stdClass` values. Browser file selection remains a separate
`BrowserFiles` operation. The `preg_*` adapter supports an explicitly bounded
PCRE subset and rejects unsupported constructs before running a browser regex.
DateTime, DateTimeImmutable and DateTimeZone adapters provide supported formatting,
calendar mutations and procedural helpers, using explicit offsets or browser IANA
timezone data. Parsing is intentionally narrower than PHP's natural-language
date parser. See View's `docs/fr/json-regex-dates.md` for exact boundaries.

Compiled `JsonSerializable::jsonSerialize()` hooks run through the same frontend
interpreter, with callback effects, exceptions and recursion checks. Date adapters
also provide supported `createFromFormat` tokens and diagnostics, DateInterval
calendar arithmetic, `diff` and DatePeriod traversal. See View's
`docs/fr/dates-avancees.md` and the combined `examples/reservation/` program.

`is_callable`, `function_exists`, `call_user_func` and `call_user_func_array`
resolve against the compiled catalogue without PHP autoload. `filter_var` uses
explicit validators/sanitizers and interpreted callback or bounded regex adapters;
View's `docs/fr/utilitaires.md` describes the supported flags and inputs.

### References and additional language forms

Reference cells preserve aliases, by-reference array traversal, referenced array
elements and function reference returns. Ordinary PHP copies retain live aliases;
State rollback snapshots isolate live cells while retaining aliases within the
restored snapshot. SPL and reference boundaries are documented
in View's `docs/fr/spl-references.md`.

The runtime also supports shifts, bitwise negation, word logical operators,
function static locals, `func_get_args`/`func_num_args`/`func_get_arg`, computed
method names and array/string method callables. Function static storage follows
component lifetime; closure instances own their static locals. User enums are
compiled as opaque cases with identity, readonly name/value and cases/from/tryFrom
dispatch. See View's `docs/fr/fonctions-avancees.md` and `docs/fr/enums.md`.

The optional eval compiler also accepts `<<=`, `>>=`, `&=`, `|=` and `^=`, with
the same single target evaluation, reference writes and error handling as direct code.

### URL, Unicode display and dynamic classes

The native catalogue includes URL/Base64 helpers, `filter_var_array`, ten
`grapheme_*` functions, normalization and a bounded `NumberFormatter` adapter.
Pure grapheme and normalization operations also work in reactive text. Dynamic
`new` and static targets resolve within the compiled class catalogue; nullsafe
receiver chains skip their remaining members and arguments when short-circuited.
See View’s [exact scope and profile example](https://github.com/MR-C0DE/phpaml-view/blob/main/docs/fr/web-unicode-dynamique.md).

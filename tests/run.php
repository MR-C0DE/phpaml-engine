<?php

declare(strict_types=1);

spl_autoload_register(static function (string $class): void {
    $prefix = 'AML\\Engine\\';
    if (!str_starts_with($class, $prefix)) return;
    require dirname(__DIR__) . '/src/' . substr($class, strlen($prefix)) . '.php';
});

use AML\Engine\ClientAction;
use AML\Engine\EngineRuntime;
use AML\Engine\Api;
use AML\Engine\StateRef;
use AML\Engine\Actions;
use AML\Engine\Effects;
use AML\Engine\EventRef;
use AML\Engine\StateNamespace;

$increment = ClientAction::increment('count', 2)->json();
if ($increment !== '{"type":"increment","target":"count","value":2}') {
    throw new RuntimeException('Increment action is invalid.');
}
$api = Api::post('/api/profile', ['name' => StateRef::to('name')])
    ->storeIn('profile', 'data')
    ->errorIn('apiError')
    ->loadingIn('apiLoading')
    ->json();
if (!str_contains($api, '"type":"api"')
    || !str_contains($api, '"$state":"name"')
    || !str_contains($api, '"result":"profile"')) {
    throw new RuntimeException('API action is invalid.');
}
$composed = Actions::sequence(
    ClientAction::increment('count'),
    Actions::when('count', 'gte', 1, ClientAction::set('message', 'ready')),
)->json();
if (!str_contains($composed, '"type":"sequence"')
    || !str_contains($composed, '"type":"condition"')
    || !str_contains($composed, '"operator":"gte"')) {
    throw new RuntimeException('Composed client actions are invalid.');
}
$transaction = Actions::transaction(
    ClientAction::set('profile.address.city', 'Montréal'),
    ClientAction::updateBy('tasks', 'id', 2, ['title' => 'Done']),
    ClientAction::sortBy('tasks', 'title', 'desc'),
)->json();
if (!str_contains($transaction, '"type":"transaction"')
    || !str_contains($transaction, '"type":"update-by"')
    || !str_contains($transaction, '"type":"sort-by"')
    || !str_contains($transaction, 'profile.address.city')) {
    throw new RuntimeException('Rich collections, nested state, or transactions are invalid.');
}
$effect = Effects::interval(250, ClientAction::increment('ticks'))->payload();
if ($effect['mode'] !== 'interval' || $effect['delay'] !== 250 || $effect['action']['target'] !== 'ticks') {
    throw new RuntimeException('Declarative effect plan is invalid.');
}
$eventEffect = Effects::onDocument(
    'aml-selection',
    ClientAction::set('selected', EventRef::to('detail.id')),
)->withCleanup(ClientAction::set('selected', null))->payload();
if (($eventEffect['action']['value']['$event'] ?? null) !== 'detail.id'
    || ($eventEffect['cleanup']['target'] ?? null) !== 'selected') {
    throw new RuntimeException('Event references or declarative cleanup are invalid.');
}
try {
    EventRef::to('target.ownerDocument.cookie');
    throw new RuntimeException('Unsafe event data was accepted.');
} catch (InvalidArgumentException) {
}
try {
    Effects::run(ClientAction::set('ready', true))->withCleanup(Api::post('/api/cleanup'));
    throw new RuntimeException('Network cleanup action was accepted.');
} catch (InvalidArgumentException) {
}
if (ClientAction::removeBy('tasks', 'id', 7)->json() !== '{"type":"remove-by","target":"tasks","value":{"key":"id","value":7}}') {
    throw new RuntimeException('Keyed collection removal is invalid.');
}
$richCollection = Actions::transaction(
    ClientAction::filterBy('tasks', 'done', false),
    ClientAction::move('tasks', 2, 0),
    ClientAction::merge('profile.address', ['city' => 'Toronto']),
)->json();
foreach (['"type":"filter-by"', '"type":"move"', '"type":"merge"'] as $expectedAction) {
    if (!str_contains($richCollection, $expectedAction)) throw new RuntimeException("Missing rich action: {$expectedAction}");
}
try {
    ClientAction::sortBy('tasks', 'title', 'sideways');
    throw new RuntimeException('Invalid sort direction was accepted.');
} catch (InvalidArgumentException) {
}
$script = EngineRuntime::script();
$scriptFeatures = str_replace(['"', 'var '], ["'", 'const '], $script);
$minifiedScript = EngineRuntime::script(null, true);
if (!str_contains($minifiedScript, 'window.AMLEngine') || strlen($minifiedScript) >= strlen($script)) {
    throw new RuntimeException('The minified compatibility runtime is unavailable.');
}
$assetPath = EngineRuntime::assetPath();
if (!is_file($assetPath) || !str_ends_with($assetPath, '/assets/engine-0.1.0-beta.2.js')) {
    throw new RuntimeException('The external browser runtime asset is unavailable.');
}
if (EngineRuntime::assetFilename(true) !== 'engine-0.1.0-beta.2.min.js') {
    throw new RuntimeException('The minified browser runtime filename is inconsistent.');
}
if (EngineRuntime::externalScript() !== '<script defer src="/_aml/engine-0.1.0-beta.2.min.js" data-aml-engine></script>') {
    throw new RuntimeException('The external browser runtime tag is inconsistent.');
}
foreach (['https://example.test/assets', '//cdn.example.test', '/assets?version=1', '/\\evil.example/assets'] as $unsafeBase) {
    try {
        EngineRuntime::externalScript($unsafeBase);
        throw new RuntimeException("Unsafe external runtime base was accepted: {$unsafeBase}");
    } catch (InvalidArgumentException) {
    }
}
$nonceScript = EngineRuntime::script('dGVzdC1ub25jZQ==');
if (!str_starts_with($nonceScript, '<script nonce="dGVzdC1ub25jZQ==" data-aml-engine>')) {
    throw new RuntimeException('CSP nonce support is invalid.');
}
try {
    EngineRuntime::script('" unsafe-inline');
    throw new RuntimeException('Unsafe CSP nonce was accepted.');
} catch (InvalidArgumentException) {
}
if (EngineRuntime::VERSION !== '0.1.0-beta.2') {
    throw new RuntimeException('Engine version is inconsistent.');
}
$package = json_decode((string) file_get_contents(dirname(__DIR__) . '/composer.json'), true, 512, JSON_THROW_ON_ERROR);
if (($package['extra']['phpaml']['version'] ?? null) !== EngineRuntime::VERSION) {
    throw new RuntimeException('The PHP and Composer engine versions differ.');
}
if (!str_contains($scriptFeatures, "window.AMLEngine")
    || !str_contains($scriptFeatures, "data-aml-client-click")
    || !str_contains($scriptFeatures, "data-aml-model")
    || !str_contains($scriptFeatures, "history.pushState")
    || !str_contains($scriptFeatures, "addEventListener('popstate'")
    || !str_contains($scriptFeatures, "lifecycle(root, 'mount'")
    || !str_contains($scriptFeatures, "lifecycle(root, 'unmount'")
    || !str_contains($scriptFeatures, "controller.abort()")
    || !str_contains($scriptFeatures, 'data-aml-validate')
    || !str_contains($scriptFeatures, 'validateForm(form)')
    || !str_contains($scriptFeatures, 'data-aml-validate-api')
    || !str_contains($scriptFeatures, 'scheduleRemoteValidation')
    || !str_contains($scriptFeatures, "prepareApiRequest(url, action, data, controller.signal, '', 'validation')")
    || !str_contains($scriptFeatures, "meta[name='csrf-token']")
    || !str_contains($scriptFeatures, "options.headers['X-CSRF-Token'] = token")
    || !str_contains($scriptFeatures, "response.headers.get('X-CSRF-Token')")
    || !str_contains($scriptFeatures, 'amlStateConfig')
    || !str_contains($scriptFeatures, 'sharedState')
    || !str_contains($scriptFeatures, 'sessionStorage')
    || !str_contains($scriptFeatures, 'localStorage')
    || !str_contains($scriptFeatures, 'safeSegments')
    || !str_contains($scriptFeatures, 'sharedTypes')
    || !str_contains($scriptFeatures, "addEventListener('storage'")
    || !str_contains($scriptFeatures, 'MutationObserver')
    || !str_contains($scriptFeatures, "action.type === 'transaction'")
    || !str_contains($scriptFeatures, "action.type === 'update-by'")
    || !str_contains($scriptFeatures, "action.type === 'filter-by'")
    || !str_contains($scriptFeatures, "action.type === 'move'")
    || !str_contains($scriptFeatures, "action.type === 'merge'")
    || !str_contains($scriptFeatures, 'pathAffects')
    || !str_contains($scriptFeatures, 'const inspect =')
    || !str_contains($scriptFeatures, 'openStateDatabase')
    || !str_contains($scriptFeatures, 'migrateValue')
    || !str_contains($scriptFeatures, 'aml:storage-migrated')
    || !str_contains($scriptFeatures, 'const stateHistory =')
    || !str_contains($scriptFeatures, 'const restore =')
    || !str_contains($scriptFeatures, 'owningTarget')
    || !str_contains($scriptFeatures, 'computedValue')
    || !str_contains($scriptFeatures, 'recomputeComputed')
    || !str_contains($scriptFeatures, 'pendingBatches')
    || !str_contains($scriptFeatures, 'aml:batch')
    || !str_contains($scriptFeatures, 'aml:transaction-error')
    || !str_contains($scriptFeatures, 'data-aml-when')
    || !str_contains($scriptFeatures, 'const existing = new Map')
    || !str_contains($scriptFeatures, 'hydrateDynamicItem')
    || !str_contains($scriptFeatures, 'releaseDynamicItem')
    || !str_contains($scriptFeatures, 'Duplicate AML collection key')
    || !str_contains($scriptFeatures, 'hasAsyncAction')
    || !str_contains($scriptFeatures, 'data-aml-list-template')
    || !str_contains($scriptFeatures, 'clearPersisted')
    || !str_contains($scriptFeatures, 'aml:storage-migration-required')
    || !str_contains($scriptFeatures, 'aml:storage-expired')
    || !str_contains($scriptFeatures, '__amlPersisted')
    || !str_contains($scriptFeatures, "aria-invalid")) {
    throw new RuntimeException('The client engine is missing state, model, or routing support.');
}
foreach (['data-aml-show-when', 'data-aml-class-when', 'data-aml-disabled-when'] as $binding) {
    if (!str_contains($scriptFeatures, $binding)) throw new RuntimeException("Missing reactive binding: {$binding}");
}
foreach (['effectRuntimes', 'activateEffect', 'cleanupEffect', 'aml:effect-run', 'aml:effect-cleanup', 'aml:effect-error', 'aml:effect-cycle'] as $effectFeature) {
    if (!str_contains($scriptFeatures, $effectFeature)) throw new RuntimeException("Missing effect support: {$effectFeature}");
}
foreach (['registerEffect', 'rewriteDynamicEffectId', 'pendingEffectOrigins', "strategy === 'exhaust'", "strategy === 'queue'", "strategy === 'latest'", 'Duplicate AML effect identifier', 'runEffects(root, state, restoredTargets)'] as $effectFeature) {
    if (!str_contains($scriptFeatures, $effectFeature)) throw new RuntimeException("Missing stable effect behavior: {$effectFeature}");
}
foreach (['value.$event', 'runtime.definition.cleanup', 'definition.throttle', 'const effects =', 'pauseEffect', 'resumeEffect', 'runEffect', 'aml:effect-pause', 'aml:effect-resume'] as $effectFeature) {
    if (!str_contains($scriptFeatures, $effectFeature)) throw new RuntimeException("Missing advanced effect support: {$effectFeature}");
}
foreach (['renderRichComponents', 'renderVirtualLists', 'data-aml-modal', 'data-aml-tab-panel', 'data-aml-accordion-trigger', 'data-aml-table-sort', 'text/x-aml-index', 'data-aml-virtual-list', 'animateIn'] as $richFeature) {
    if (!str_contains($scriptFeatures, $richFeature)) throw new RuntimeException("Missing rich component runtime: {$richFeature}");
}
foreach (['data-aml-toast', 'toastTimers', 'data-aml-disclosure-trigger', "[role='menuitem']", 'data-aml-tooltip-trigger', 'data-aml-multi-step-form', 'preserveForm', 'restoreForm', "control.type === 'file'"] as $advancedUiFeature) {
    if (!str_contains($scriptFeatures, $advancedUiFeature)) throw new RuntimeException("Missing advanced UI/form support: {$advancedUiFeature}");
}
foreach (['clearFormDraft', 'new FormData(form)', 'data-aml-step-next', "[data-aml-validate]:not([disabled])", 'relatedTarget instanceof Node', "clearTimeout(toastTimers.get(toast))", "actionForm && !validateForm(actionForm)"] as $auditedUiGuard) {
    if (!str_contains($scriptFeatures, $auditedUiGuard)) throw new RuntimeException("Missing audited UI guard: {$auditedUiGuard}");
}
foreach (["prefers-reduced-motion: reduce", 'ResizeObserver', "source.state !== list.dataset.amlList", "Array.from(event.dataTransfer.types).includes('text/x-aml-index')", "sort.closest('table')", "event.altKey", "input: 'keyboard'"] as $guard) {
    if (!str_contains($scriptFeatures, $guard)) throw new RuntimeException("Missing audited rich-component guard: {$guard}");
}
foreach (['renderContexts', 'data-aml-context-provider', 'data-aml-context-bind', "action.type === 'navigate'", 'data-aml-navigation-boundary', 'showNavigationState', 'focusNavigatedPage', 'history.replaceState', 'const route =', 'const context ='] as $navigationFeature) {
    if (!str_contains($scriptFeatures, $navigationFeature)) throw new RuntimeException("Missing context/navigation feature: {$navigationFeature}");
}
foreach (['navigationRuntimes', 'AbortController', 'matchingContextProvider', 'restoreContexts', 'syncHead', "setAttribute('inert'", 'X-AML-Navigation-State'] as $navigationGuard) {
    if (!str_contains($scriptFeatures, $navigationGuard)) throw new RuntimeException("Missing audited navigation guard: {$navigationGuard}");
}
if (!str_contains($scriptFeatures, "error?.name === 'AbortError'") || !str_contains($scriptFeatures, 'owner.generation === executionGeneration')) {
    throw new RuntimeException('Canceled effects may corrupt API loading or error state.');
}
if (!str_contains($scriptFeatures, 'data-aml-list') || !str_contains($scriptFeatures, "action.type === 'append'")) {
    throw new RuntimeException('Reactive collection support is missing.');
}
$localActions = substr($scriptFeatures, strpos($scriptFeatures, 'const apply ='), strpos($scriptFeatures, 'const resolveData =') - strpos($scriptFeatures, 'const apply ='));
if (str_contains($localActions, 'fetch(')) {
    throw new RuntimeException('Local client actions must not contact the server.');
}

foreach (['__proto__.polluted', 'user.constructor.value', 'prototype.value'] as $dangerous) {
    try {
        ClientAction::set($dangerous, true);
        throw new RuntimeException("Dangerous state path was accepted: {$dangerous}");
    } catch (InvalidArgumentException) {
    }
}

foreach (['__proto__.id', 'constructor.name', 'profile.prototype'] as $dangerousKey) {
    try {
        ClientAction::sortBy('tasks', $dangerousKey);
        throw new RuntimeException("Dangerous collection path was accepted: {$dangerousKey}");
    } catch (InvalidArgumentException) {
    }
}
try {
    ClientAction::merge('profile', ['safe' => ['constructor' => 'blocked']])->json();
    throw new RuntimeException('Reserved nested client data key was accepted.');
} catch (InvalidArgumentException) {
}

StateNamespace::enter('AuditComponent');
try {
    $scopedCondition = Actions::when('ready', 'truthy', true, ClientAction::set('done', true))->json();
    $scopedApi = Api::get('/api/audit')->storeIn('result', 'data.profile')->json();
} finally {
    StateNamespace::leave();
}
if (!str_contains($scopedCondition, 'components.AuditComponent.i1.ready')
    || !str_contains($scopedApi, '"result":"components.AuditComponent.i1.result"')
    || !str_contains($scopedApi, '"select":"data.profile"')) {
    throw new RuntimeException('Component-scoped conditions or API selection are inconsistent.');
}

echo "45 passed, 0 failed.\n";

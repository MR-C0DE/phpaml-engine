<?php

declare(strict_types=1);

if (($_GET['api'] ?? null) === 'effect') {
    $query = (string) ($_GET['q'] ?? '');
    if ($query === 'first') usleep(200_000);
    if ($query === 'failure') http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['value' => $query], JSON_THROW_ON_ERROR);
    return;
}

require dirname(__DIR__) . '/src/EngineRuntime.php';

use AML\Engine\EngineRuntime;

$state = htmlspecialchars(json_encode([
    'profile' => ['name' => 'Initial', 'address' => ['city' => 'Toronto']],
    'tasks' => [
        ['id' => 2, 'title' => 'Beta'],
        ['id' => 1, 'title' => 'Alpha'],
    ],
], JSON_THROW_ON_ERROR), ENT_QUOTES, 'UTF-8');

$transaction = htmlspecialchars(json_encode([
    'type' => 'transaction',
    'actions' => [
        ['type' => 'set', 'target' => 'profile.name', 'value' => 'Updated'],
        ['type' => 'merge', 'target' => 'profile.address', 'value' => ['country' => 'Canada']],
        ['type' => 'sort-by', 'target' => 'tasks', 'value' => ['key' => 'title', 'direction' => 'asc']],
        ['type' => 'update-by', 'target' => 'tasks', 'value' => ['key' => 'id', 'value' => 2, 'changes' => ['title' => 'Gamma']]],
    ],
], JSON_THROW_ON_ERROR), ENT_QUOTES, 'UTF-8');
$stressState = htmlspecialchars(json_encode([
    'first' => 'AML',
    'last' => 'View',
    'fullName' => 'AML View',
    'ready' => false,
    'items' => array_map(static fn (int $id): array => ['id' => $id, 'label' => 'Item ' . $id], range(1, 1000)),
], JSON_THROW_ON_ERROR), ENT_QUOTES, 'UTF-8');
$stressConfig = htmlspecialchars(json_encode([
    'shared' => [],
    'persisted' => [],
    'types' => [],
    'computed' => [
        'fullName' => ['dependencies' => ['first', 'last'], 'operation' => 'concat', 'separator' => ' '],
    ],
], JSON_THROW_ON_ERROR), ENT_QUOTES, 'UTF-8');
$stressAction = htmlspecialchars(json_encode([
    'type' => 'sequence',
    'actions' => [
        ['type' => 'set', 'target' => 'first', 'value' => 'Reactive'],
        ['type' => 'set', 'target' => 'last', 'value' => 'Complete'],
        ['type' => 'set', 'target' => 'ready', 'value' => true],
        ['type' => 'reverse', 'target' => 'items', 'value' => null],
    ],
], JSON_THROW_ON_ERROR), ENT_QUOTES, 'UTF-8');
$richState = htmlspecialchars(json_encode([
    'richModal' => false,
    'richTab' => 'Overview',
    'richAccordion' => '',
    'richRows' => [['id' => 1, 'name' => 'Zulu'], ['id' => 2, 'name' => 'Alpha']],
    'virtualRows' => array_map(static fn (int $id): array => ['id' => $id, 'name' => 'Virtual ' . $id], range(1, 200)),
], JSON_THROW_ON_ERROR), ENT_QUOTES, 'UTF-8');
?><!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>PHPAML Engine browser fixture</title></head>
<body>
<main>
  <h1>PHPAML Engine browser fixture</h1>
  <section data-aml-client data-aml-history="100" id="root-a">
    <template data-aml-state="<?= $state ?>" data-aml-state-config="{&quot;shared&quot;:{},&quot;persisted&quot;:{},&quot;types&quot;:{}}"></template>
    <p>Name: <span data-aml-bind="profile.name"></span></p>
    <p>City: <span data-aml-bind="profile.address.city"></span></p>
    <p>Country: <span data-aml-bind="profile.address.country"></span></p>
    <button id="run-transaction" data-aml-client-click="<?= $transaction ?>">Run transaction</button>
    <button id="restore-initial" type="button">Restore initial</button>
    <p>Transactions: <output id="transaction-count">0</output></p>
    <p>History: <output id="history-count">0</output></p>
    <ul data-aml-list="tasks" data-aml-list-label="title" data-aml-list-key="id" data-aml-list-item-tag="li">
      <template data-aml-list-template><strong data-aml-item-bind="title"></strong></template>
    </ul>
  </section>
  <section data-aml-client id="root-b">
    <template data-aml-state="{&quot;counter&quot;:0}" data-aml-state-config="{&quot;shared&quot;:{},&quot;persisted&quot;:{},&quot;types&quot;:{&quot;counter&quot;:&quot;int&quot;}}"></template>
    <button id="increment-b" data-aml-client-click="{&quot;type&quot;:&quot;increment&quot;,&quot;target&quot;:&quot;counter&quot;,&quot;value&quot;:1}">Increment B</button>
    <output data-aml-bind="counter"></output>
  </section>
  <section data-aml-client id="root-c">
    <template data-aml-state="{&quot;account&quot;:{&quot;profile&quot;:{&quot;name&quot;:&quot;Default&quot;},&quot;active&quot;:false}}" data-aml-state-config="{&quot;shared&quot;:{},&quot;persisted&quot;:{&quot;account&quot;:{&quot;storage&quot;:&quot;indexeddb&quot;,&quot;key&quot;:&quot;fixture.account&quot;,&quot;version&quot;:2,&quot;expiresAfter&quot;:null,&quot;migrations&quot;:{&quot;2&quot;:{&quot;rename&quot;:{&quot;name&quot;:&quot;profile.name&quot;},&quot;defaults&quot;:{&quot;active&quot;:true},&quot;remove&quot;:[&quot;legacyToken&quot;]}}}},&quot;types&quot;:{&quot;account&quot;:&quot;array&quot;}}"></template>
    <button id="prepare-migration" type="button">Test IndexedDB migration</button>
    <p>Migrated: <span data-aml-bind="account.profile.name"></span></p>
    <p>Active: <span data-aml-bind="account.active"></span></p>
    <output id="migration-status">pending</output>
  </section>
  <section data-aml-client id="root-d">
    <template data-aml-state="{&quot;synced&quot;:&quot;initial&quot;}" data-aml-state-config="{&quot;shared&quot;:{},&quot;persisted&quot;:{&quot;synced&quot;:{&quot;storage&quot;:&quot;local&quot;,&quot;key&quot;:&quot;fixture.synced&quot;,&quot;version&quot;:1,&quot;expiresAfter&quot;:null,&quot;migrations&quot;:[]}},&quot;types&quot;:{&quot;synced&quot;:&quot;string&quot;}}"></template>
    <button id="sync-tabs" data-aml-client-click="{&quot;type&quot;:&quot;set&quot;,&quot;target&quot;:&quot;synced&quot;,&quot;value&quot;:&quot;from-first-tab&quot;}">Synchronize tabs</button>
    <p>Cross tab: <output data-aml-bind="synced"></output></p>
  </section>
  <section data-aml-client id="root-e">
    <template data-aml-state="{&quot;safe&quot;:&quot;fallback&quot;}" data-aml-state-config="{&quot;shared&quot;:{},&quot;persisted&quot;:{&quot;safe&quot;:{&quot;storage&quot;:&quot;local&quot;,&quot;key&quot;:&quot;fixture.corrupt&quot;,&quot;version&quot;:1,&quot;expiresAfter&quot;:null,&quot;migrations&quot;:[]}},&quot;types&quot;:{&quot;safe&quot;:&quot;string&quot;}}"></template>
    <button id="test-corrupt" type="button">Test corrupt storage</button>
    <p>Corrupt fallback: <output data-aml-bind="safe"></output></p>
    <output id="corrupt-status">pending</output>
  </section>
  <section data-aml-client id="root-f">
    <template data-aml-state="<?= $stressState ?>" data-aml-state-config="<?= $stressConfig ?>"></template>
    <button id="mark-key" type="button">Mark keyed item</button>
    <button id="stress-update" data-aml-client-click="<?= $stressAction ?>">Run 1000 item update</button>
    <p>Computed: <output data-aml-bind="fullName"></output></p>
    <span data-aml-when="{&quot;state&quot;:&quot;ready&quot;,&quot;equals&quot;:true}">
      <template data-aml-when-then><strong>Conditional ready</strong></template>
      <template data-aml-when-else><strong>Conditional waiting</strong></template>
      <span data-aml-when-content><strong>Conditional waiting</strong></span>
    </span>
    <p>Batches: <output id="batch-count">0</output></p>
    <p>Key identity: <output id="key-identity">pending</output></p>
    <ol data-aml-list="items" data-aml-list-label="label" data-aml-list-key="id" data-aml-list-item-tag="li"></ol>
  </section>
  <section data-aml-client id="root-g">
    <template data-aml-state="{&quot;value&quot;:&quot;initial&quot;}" data-aml-state-config="{&quot;shared&quot;:{},&quot;persisted&quot;:{},&quot;types&quot;:{},&quot;computed&quot;:{}}"></template>
    <button id="failing-transaction" data-aml-client-click="{&quot;type&quot;:&quot;transaction&quot;,&quot;actions&quot;:[{&quot;type&quot;:&quot;set&quot;,&quot;target&quot;:&quot;value&quot;,&quot;value&quot;:&quot;changed&quot;},{&quot;type&quot;:&quot;unknown&quot;,&quot;target&quot;:&quot;value&quot;,&quot;value&quot;:null}]}">Run failing transaction</button>
    <p>Rollback value: <output data-aml-bind="value"></output></p>
    <p>Rollback status: <output id="rollback-status">pending</output></p>
  </section>
  <section data-aml-client id="root-h">
    <template data-aml-state="{&quot;dynamicItems&quot;:[]}" data-aml-state-config="{&quot;shared&quot;:{},&quot;persisted&quot;:{},&quot;types&quot;:{&quot;dynamicItems&quot;:&quot;array&quot;},&quot;computed&quot;:{}}"></template>
    <button data-aml-client-click="{&quot;type&quot;:&quot;append&quot;,&quot;target&quot;:&quot;dynamicItems&quot;,&quot;value&quot;:{&quot;id&quot;:1,&quot;label&quot;:&quot;First&quot;}}">Add dynamic first</button>
    <button data-aml-client-click="{&quot;type&quot;:&quot;append&quot;,&quot;target&quot;:&quot;dynamicItems&quot;,&quot;value&quot;:{&quot;id&quot;:2,&quot;label&quot;:&quot;Second&quot;}}">Add dynamic second</button>
    <button id="remove-dynamic-first" data-aml-client-click="{&quot;type&quot;:&quot;remove-by&quot;,&quot;target&quot;:&quot;dynamicItems&quot;,&quot;value&quot;:{&quot;key&quot;:&quot;id&quot;,&quot;value&quot;:1}}">Remove dynamic first</button>
    <button id="dispatch-dynamic-effect" type="button">Dispatch dynamic effect</button>
    <ul data-aml-list="dynamicItems" data-aml-list-label="label" data-aml-list-key="id" data-aml-list-item-tag="li">
      <template data-aml-list-template>
        <template data-aml-state="{&quot;components.DynamicCounter.i1.count&quot;:0}" data-aml-state-config="{&quot;shared&quot;:{},&quot;persisted&quot;:{},&quot;types&quot;:{&quot;components.DynamicCounter.i1.count&quot;:&quot;int&quot;},&quot;computed&quot;:{},&quot;effects&quot;:{&quot;components.DynamicCounter.i1.listen&quot;:{&quot;mode&quot;:&quot;listener&quot;,&quot;action&quot;:{&quot;type&quot;:&quot;increment&quot;,&quot;target&quot;:&quot;components.DynamicCounter.i1.count&quot;,&quot;value&quot;:1},&quot;delay&quot;:null,&quot;target&quot;:&quot;document&quot;,&quot;event&quot;:&quot;aml-dynamic-effect&quot;,&quot;dependencies&quot;:[],&quot;runOnMount&quot;:true,&quot;debounce&quot;:0,&quot;concurrency&quot;:&quot;latest&quot;}}}"></template>
        <span data-aml-item-bind="label"></span>
        <button data-aml-client-click="{&quot;type&quot;:&quot;increment&quot;,&quot;target&quot;:&quot;components.DynamicCounter.i1.count&quot;,&quot;value&quot;:1}">Increment dynamic</button>
        <output data-aml-bind="components.DynamicCounter.i1.count">0</output>
      </template>
    </ul>
  </section>
  <section data-aml-client id="root-i">
    <template data-aml-state="{&quot;source&quot;:0,&quot;derived&quot;:0,&quot;ticks&quot;:0,&quot;events&quot;:0}" data-aml-state-config="{&quot;shared&quot;:{},&quot;persisted&quot;:{},&quot;types&quot;:{&quot;source&quot;:&quot;int&quot;,&quot;derived&quot;:&quot;int&quot;,&quot;ticks&quot;:&quot;int&quot;,&quot;events&quot;:&quot;int&quot;},&quot;computed&quot;:{},&quot;effects&quot;:{&quot;page.synchronize&quot;:{&quot;mode&quot;:&quot;run&quot;,&quot;action&quot;:{&quot;type&quot;:&quot;set&quot;,&quot;target&quot;:&quot;derived&quot;,&quot;value&quot;:{&quot;$state&quot;:&quot;source&quot;}},&quot;delay&quot;:null,&quot;target&quot;:null,&quot;event&quot;:null,&quot;dependencies&quot;:[&quot;source&quot;],&quot;runOnMount&quot;:false,&quot;debounce&quot;:20},&quot;page.clock&quot;:{&quot;mode&quot;:&quot;interval&quot;,&quot;action&quot;:{&quot;type&quot;:&quot;increment&quot;,&quot;target&quot;:&quot;ticks&quot;,&quot;value&quot;:1},&quot;delay&quot;:50,&quot;target&quot;:null,&quot;event&quot;:null,&quot;dependencies&quot;:[],&quot;runOnMount&quot;:true,&quot;debounce&quot;:0},&quot;page.visibility&quot;:{&quot;mode&quot;:&quot;listener&quot;,&quot;action&quot;:{&quot;type&quot;:&quot;increment&quot;,&quot;target&quot;:&quot;events&quot;,&quot;value&quot;:1},&quot;delay&quot;:null,&quot;target&quot;:&quot;document&quot;,&quot;event&quot;:&quot;aml-fixture-event&quot;,&quot;dependencies&quot;:[],&quot;runOnMount&quot;:true,&quot;debounce&quot;:0}}}"></template>
    <button id="effect-source" data-aml-client-click="{&quot;type&quot;:&quot;increment&quot;,&quot;target&quot;:&quot;source&quot;,&quot;value&quot;:1}">Change effect source</button>
    <button id="effect-event" type="button">Dispatch effect event</button>
    <p>Effect source: <output data-aml-bind="source"></output></p>
    <p>Effect derived: <output data-aml-bind="derived"></output></p>
    <p>Effect ticks: <output data-aml-bind="ticks"></output></p>
    <p>Effect events: <output data-aml-bind="events"></output></p>
    <p>Effect runs: <output id="effect-runs">0</output></p>
    <p>Effect cleanups: <output id="effect-cleanups">0</output></p>
  </section>
  <button id="unmount-effects" type="button">Unmount effects</button>
  <output id="unmount-ticks">pending</output>
  <output id="unmount-cleanups">pending</output>
  <section data-aml-client id="root-j">
    <template data-aml-state="{&quot;loop&quot;:0}" data-aml-state-config="{&quot;shared&quot;:{},&quot;persisted&quot;:{},&quot;types&quot;:{&quot;loop&quot;:&quot;int&quot;},&quot;computed&quot;:{},&quot;effects&quot;:{&quot;page.loop&quot;:{&quot;mode&quot;:&quot;run&quot;,&quot;action&quot;:{&quot;type&quot;:&quot;increment&quot;,&quot;target&quot;:&quot;loop&quot;,&quot;value&quot;:1},&quot;delay&quot;:null,&quot;target&quot;:null,&quot;event&quot;:null,&quot;dependencies&quot;:[&quot;loop&quot;],&quot;runOnMount&quot;:true,&quot;debounce&quot;:0}}}"></template>
    <p>Effect cycle value: <output data-aml-bind="loop"></output></p>
    <p>Effect cycle status: <output id="effect-cycle-status">pending</output></p>
  </section>
  <section data-aml-client id="root-k">
    <template data-aml-state="{&quot;slowLoop&quot;:0}" data-aml-state-config="{&quot;shared&quot;:{},&quot;persisted&quot;:{},&quot;types&quot;:{&quot;slowLoop&quot;:&quot;int&quot;},&quot;computed&quot;:{},&quot;effects&quot;:{&quot;page.slowLoop&quot;:{&quot;mode&quot;:&quot;run&quot;,&quot;action&quot;:{&quot;type&quot;:&quot;increment&quot;,&quot;target&quot;:&quot;slowLoop&quot;,&quot;value&quot;:1},&quot;delay&quot;:null,&quot;target&quot;:null,&quot;event&quot;:null,&quot;dependencies&quot;:[&quot;slowLoop&quot;],&quot;runOnMount&quot;:true,&quot;debounce&quot;:20,&quot;concurrency&quot;:&quot;latest&quot;}}}"></template>
    <p>Slow effect cycle: <output data-aml-bind="slowLoop"></output></p>
    <p>Slow cycle status: <output id="slow-cycle-status">pending</output></p>
  </section>
  <section data-aml-client id="root-l">
    <template data-aml-state="{&quot;query&quot;:&quot;&quot;,&quot;apiResult&quot;:&quot;&quot;,&quot;apiError&quot;:&quot;&quot;,&quot;apiLoading&quot;:false}" data-aml-state-config="{&quot;shared&quot;:{},&quot;persisted&quot;:{},&quot;types&quot;:{&quot;query&quot;:&quot;string&quot;,&quot;apiResult&quot;:&quot;string&quot;,&quot;apiError&quot;:&quot;string&quot;,&quot;apiLoading&quot;:&quot;bool&quot;},&quot;computed&quot;:{},&quot;effects&quot;:{&quot;page.api&quot;:{&quot;mode&quot;:&quot;run&quot;,&quot;action&quot;:{&quot;type&quot;:&quot;api&quot;,&quot;method&quot;:&quot;GET&quot;,&quot;url&quot;:&quot;/browser-fixture.php?api=effect&quot;,&quot;data&quot;:{&quot;q&quot;:{&quot;$state&quot;:&quot;query&quot;}},&quot;result&quot;:&quot;apiResult&quot;,&quot;error&quot;:&quot;apiError&quot;,&quot;loading&quot;:&quot;apiLoading&quot;,&quot;select&quot;:&quot;value&quot;},&quot;delay&quot;:null,&quot;target&quot;:null,&quot;event&quot;:null,&quot;dependencies&quot;:[&quot;query&quot;],&quot;runOnMount&quot;:false,&quot;debounce&quot;:0,&quot;concurrency&quot;:&quot;latest&quot;}}}"></template>
    <button id="api-first" data-aml-client-click="{&quot;type&quot;:&quot;set&quot;,&quot;target&quot;:&quot;query&quot;,&quot;value&quot;:&quot;first&quot;}">Start slow effect</button>
    <button id="api-second" data-aml-client-click="{&quot;type&quot;:&quot;set&quot;,&quot;target&quot;:&quot;query&quot;,&quot;value&quot;:&quot;second&quot;}">Replace effect</button>
    <button id="api-failure" data-aml-client-click="{&quot;type&quot;:&quot;set&quot;,&quot;target&quot;:&quot;query&quot;,&quot;value&quot;:&quot;failure&quot;}">Fail effect API</button>
    <p>API result: <output data-aml-bind="apiResult"></output></p>
    <p>API loading: <output data-aml-bind="apiLoading"></output></p>
    <p>API error: <output data-aml-bind="apiError"></output></p>
    <p>Effect API errors: <output id="effect-api-errors">0</output></p>
  </section>
  <section data-aml-client data-aml-history="10" id="root-m">
    <template data-aml-state="{&quot;restoreSource&quot;:0,&quot;restoreDerived&quot;:0}" data-aml-state-config="{&quot;shared&quot;:{},&quot;persisted&quot;:{},&quot;types&quot;:{&quot;restoreSource&quot;:&quot;int&quot;,&quot;restoreDerived&quot;:&quot;int&quot;},&quot;computed&quot;:{},&quot;effects&quot;:{&quot;page.restore&quot;:{&quot;mode&quot;:&quot;run&quot;,&quot;action&quot;:{&quot;type&quot;:&quot;set&quot;,&quot;target&quot;:&quot;restoreDerived&quot;,&quot;value&quot;:{&quot;$state&quot;:&quot;restoreSource&quot;}},&quot;delay&quot;:null,&quot;target&quot;:null,&quot;event&quot;:null,&quot;dependencies&quot;:[&quot;restoreSource&quot;],&quot;runOnMount&quot;:false,&quot;debounce&quot;:0,&quot;concurrency&quot;:&quot;latest&quot;}}}"></template>
    <button id="change-restored-effect" data-aml-client-click="{&quot;type&quot;:&quot;increment&quot;,&quot;target&quot;:&quot;restoreSource&quot;,&quot;value&quot;:1}">Change restored effect</button>
    <button id="restore-effect-state" type="button">Restore effect state</button>
    <p>Restored source: <output data-aml-bind="restoreSource"></output></p>
    <p>Restored derived: <output data-aml-bind="restoreDerived"></output></p>
  </section>
  <section data-aml-client id="root-n">
    <template data-aml-state="{&quot;effectItems&quot;:[],&quot;globalEffectCount&quot;:0}" data-aml-state-config="{&quot;shared&quot;:{},&quot;persisted&quot;:{},&quot;types&quot;:{&quot;effectItems&quot;:&quot;array&quot;,&quot;globalEffectCount&quot;:&quot;int&quot;},&quot;computed&quot;:{},&quot;effects&quot;:{}}"></template>
    <button data-aml-client-click="{&quot;type&quot;:&quot;append&quot;,&quot;target&quot;:&quot;effectItems&quot;,&quot;value&quot;:{&quot;id&quot;:1,&quot;label&quot;:&quot;No state&quot;}}">Add stateless effect</button>
    <button data-aml-client-click="{&quot;type&quot;:&quot;remove-by&quot;,&quot;target&quot;:&quot;effectItems&quot;,&quot;value&quot;:{&quot;key&quot;:&quot;id&quot;,&quot;value&quot;:1}}">Remove stateless effect</button>
    <button id="dispatch-stateless-effect" type="button">Dispatch stateless effect</button>
    <output data-aml-bind="globalEffectCount"></output>
    <ul data-aml-list="effectItems" data-aml-list-label="label" data-aml-list-key="id" data-aml-list-item-tag="li">
      <template data-aml-list-template>
        <template data-aml-state="{}" data-aml-state-config="{&quot;shared&quot;:{},&quot;persisted&quot;:{},&quot;types&quot;:{},&quot;computed&quot;:{},&quot;effects&quot;:{&quot;components.Stateless.i1.listen&quot;:{&quot;mode&quot;:&quot;listener&quot;,&quot;action&quot;:{&quot;type&quot;:&quot;increment&quot;,&quot;target&quot;:&quot;globalEffectCount&quot;,&quot;value&quot;:1},&quot;delay&quot;:null,&quot;target&quot;:&quot;document&quot;,&quot;event&quot;:&quot;aml-stateless-effect&quot;,&quot;dependencies&quot;:[],&quot;runOnMount&quot;:true,&quot;debounce&quot;:0,&quot;concurrency&quot;:&quot;latest&quot;}}}"></template>
        <span data-aml-item-bind="label"></span>
      </template>
    </ul>
  </section>
  <section data-aml-client id="root-o">
    <template data-aml-state="{&quot;eventValue&quot;:&quot;initial&quot;}" data-aml-state-config="{&quot;shared&quot;:{},&quot;persisted&quot;:{},&quot;types&quot;:{&quot;eventValue&quot;:&quot;string&quot;},&quot;computed&quot;:{},&quot;effects&quot;:{&quot;page.eventReader&quot;:{&quot;mode&quot;:&quot;listener&quot;,&quot;action&quot;:{&quot;type&quot;:&quot;set&quot;,&quot;target&quot;:&quot;eventValue&quot;,&quot;value&quot;:{&quot;$event&quot;:&quot;detail.id&quot;}},&quot;delay&quot;:null,&quot;target&quot;:&quot;document&quot;,&quot;event&quot;:&quot;aml-event-ref&quot;,&quot;cleanup&quot;:{&quot;type&quot;:&quot;set&quot;,&quot;target&quot;:&quot;eventValue&quot;,&quot;value&quot;:&quot;cleaned&quot;},&quot;dependencies&quot;:[],&quot;runOnMount&quot;:true,&quot;debounce&quot;:0,&quot;throttle&quot;:0,&quot;concurrency&quot;:&quot;latest&quot;}}}"></template>
    <button id="dispatch-event-ref" type="button">Dispatch event reference</button>
    <button id="pause-event-effect" type="button">Pause event effect</button>
    <button id="resume-event-effect" type="button">Resume event effect</button>
    <button id="inspect-event-effect" type="button">Inspect event effect</button>
    <output data-aml-bind="eventValue"></output>
    <output id="effect-inspection">pending</output>
  </section>
  <section data-aml-client id="root-p">
    <template data-aml-state="{&quot;throttleSource&quot;:0,&quot;throttleRuns&quot;:0}" data-aml-state-config="{&quot;shared&quot;:{},&quot;persisted&quot;:{},&quot;types&quot;:{&quot;throttleSource&quot;:&quot;int&quot;,&quot;throttleRuns&quot;:&quot;int&quot;},&quot;computed&quot;:{},&quot;effects&quot;:{&quot;page.throttled&quot;:{&quot;mode&quot;:&quot;run&quot;,&quot;action&quot;:{&quot;type&quot;:&quot;increment&quot;,&quot;target&quot;:&quot;throttleRuns&quot;,&quot;value&quot;:1},&quot;delay&quot;:null,&quot;target&quot;:null,&quot;event&quot;:null,&quot;cleanup&quot;:null,&quot;dependencies&quot;:[&quot;throttleSource&quot;],&quot;runOnMount&quot;:false,&quot;debounce&quot;:0,&quot;throttle&quot;:200,&quot;concurrency&quot;:&quot;latest&quot;}}}"></template>
    <button id="trigger-throttle" data-aml-client-click="{&quot;type&quot;:&quot;increment&quot;,&quot;target&quot;:&quot;throttleSource&quot;,&quot;value&quot;:1}">Trigger throttled effect</button>
    <button id="burst-throttle" type="button">Burst throttled effect</button>
    <output data-aml-bind="throttleRuns"></output>
  </section>
  <section data-aml-client id="root-q">
    <template data-aml-state="<?= $richState ?>" data-aml-state-config="{&quot;shared&quot;:{},&quot;persisted&quot;:{},&quot;types&quot;:{&quot;richModal&quot;:&quot;bool&quot;,&quot;richTab&quot;:&quot;string&quot;,&quot;richAccordion&quot;:&quot;string&quot;,&quot;richRows&quot;:&quot;array&quot;,&quot;virtualRows&quot;:&quot;array&quot;},&quot;computed&quot;:{},&quot;effects&quot;:{}}"></template>
    <button id="open-rich-modal" data-aml-client-click="{&quot;type&quot;:&quot;set&quot;,&quot;target&quot;:&quot;richModal&quot;,&quot;value&quot;:true}">Open rich modal</button>
    <dialog data-aml-modal="{&quot;state&quot;:&quot;richModal&quot;}" aria-modal="true"><h2>Rich modal</h2><button data-aml-client-click="{&quot;type&quot;:&quot;set&quot;,&quot;target&quot;:&quot;richModal&quot;,&quot;value&quot;:false}">Close rich modal</button></dialog>
    <div data-aml-tabs><div role="tablist">
      <button role="tab" data-aml-tab="{&quot;state&quot;:&quot;richTab&quot;,&quot;value&quot;:&quot;Overview&quot;}" data-aml-client-click="{&quot;type&quot;:&quot;set&quot;,&quot;target&quot;:&quot;richTab&quot;,&quot;value&quot;:&quot;Overview&quot;}">Overview</button>
      <button role="tab" data-aml-tab="{&quot;state&quot;:&quot;richTab&quot;,&quot;value&quot;:&quot;Settings&quot;}" data-aml-client-click="{&quot;type&quot;:&quot;set&quot;,&quot;target&quot;:&quot;richTab&quot;,&quot;value&quot;:&quot;Settings&quot;}">Settings</button>
    </div><section data-aml-tab-panel="{&quot;state&quot;:&quot;richTab&quot;,&quot;value&quot;:&quot;Overview&quot;}">Overview panel</section><section data-aml-tab-panel="{&quot;state&quot;:&quot;richTab&quot;,&quot;value&quot;:&quot;Settings&quot;}">Settings panel</section></div>
    <div data-aml-accordion><section><button data-aml-accordion-trigger="{&quot;state&quot;:&quot;richAccordion&quot;,&quot;value&quot;:&quot;Details&quot;}">Details</button><div data-aml-accordion-panel="{&quot;state&quot;:&quot;richAccordion&quot;,&quot;value&quot;:&quot;Details&quot;}">Accordion content</div></section></div>
    <table><thead><tr><th data-aml-table-sort="{&quot;state&quot;:&quot;richRows&quot;,&quot;key&quot;:&quot;name&quot;}" tabindex="0" aria-sort="none">Name</th></tr></thead><tbody data-aml-list="richRows" data-aml-list-label="name" data-aml-list-key="id" data-aml-list-item-tag="tr"><template data-aml-list-template><td data-aml-item-bind="name"></td></template></tbody></table>
    <button id="simulate-rich-drag" type="button">Simulate rich drag</button>
    <ul data-aml-list="richRows" data-aml-list-label="name" data-aml-list-key="id" data-aml-list-item-tag="li" data-aml-sortable="true"></ul>
    <div data-aml-virtual-list="{&quot;state&quot;:&quot;virtualRows&quot;,&quot;key&quot;:&quot;id&quot;,&quot;rowHeight&quot;:32,&quot;overscan&quot;:2}" style="height:160px;overflow-y:auto;position:relative"><div data-aml-virtual-content style="position:relative"><template data-aml-virtual-template><span data-aml-item-bind="name"></span></template></div></div>
  </section>
</main>
<?= EngineRuntime::script() ?>
<script>
const rootA = document.querySelector('#root-a');
const transactionCount = document.querySelector('#transaction-count');
const historyCount = document.querySelector('#history-count');
rootA.addEventListener('aml:transaction', () => {
  transactionCount.value = String(Number(transactionCount.value) + 1);
  historyCount.value = String(AMLEngine.history(rootA).length);
});
document.querySelector('#restore-initial').addEventListener('click', () => {
  AMLEngine.restore(rootA, 0);
  historyCount.value = String(AMLEngine.history(rootA).length);
});
historyCount.value = String(AMLEngine.history(rootA).length);
const rootC = document.querySelector('#root-c');
rootC.addEventListener('aml:storage-migrated', () => {
  document.querySelector('#migration-status').value = 'migrated';
});
document.querySelector('#prepare-migration').addEventListener('click', async () => {
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open('phpaml-engine', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const transaction = database.transaction('state', 'readwrite');
    const request = transaction.objectStore('state').put(JSON.stringify({
      __amlPersisted: true,
      version: 1,
      savedAt: Date.now(),
      value: {name: 'Legacy', legacyToken: 'remove-me'},
    }), 'fixture.account');
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
  database.close();
  AMLEngine.unmount(rootC);
  AMLEngine.mount(document);
});
const rootE = document.querySelector('#root-e');
rootE.addEventListener('aml:storage-error', () => {
  document.querySelector('#corrupt-status').value = 'handled';
});
document.querySelector('#test-corrupt').addEventListener('click', () => {
  localStorage.setItem('fixture.corrupt', '{not-json');
  AMLEngine.unmount(rootE);
  AMLEngine.mount(document);
});
const rootF = document.querySelector('#root-f');
document.querySelector('#mark-key').addEventListener('click', () => {
  rootF.querySelector('[data-aml-list-key="1"]').dataset.preserved = 'yes';
});
rootF.addEventListener('aml:batch', () => {
  const count = document.querySelector('#batch-count');
  count.value = String(Number(count.value) + 1);
  document.querySelector('#key-identity').value = rootF.querySelector('[data-aml-list-key="1"]')?.dataset.preserved === 'yes' ? 'preserved' : 'lost';
});
document.querySelector('#root-g').addEventListener('aml:transaction-error', () => {
  document.querySelector('#rollback-status').value = 'rolled-back';
});
document.querySelector('#dispatch-dynamic-effect').addEventListener('click', () => document.dispatchEvent(new Event('aml-dynamic-effect')));
const rootI = document.querySelector('#root-i');
document.querySelector('#root-j').addEventListener('aml:effect-cycle', () => {
  document.querySelector('#effect-cycle-status').value = 'blocked';
});
AMLEngine.unmount(document.querySelector('#root-j'));
AMLEngine.mount(document);
document.querySelector('#root-k').addEventListener('aml:effect-cycle', () => {
  document.querySelector('#slow-cycle-status').value = 'blocked';
});
AMLEngine.unmount(document.querySelector('#root-k'));
AMLEngine.mount(document);
document.querySelector('#root-l').addEventListener('aml:effect-error', () => {
  const output = document.querySelector('#effect-api-errors');
  output.value = String(Number(output.value) + 1);
});
document.querySelector('#restore-effect-state').addEventListener('click', () => AMLEngine.restore(document.querySelector('#root-m'), 0));
document.querySelector('#dispatch-stateless-effect').addEventListener('click', () => document.dispatchEvent(new Event('aml-stateless-effect')));
const rootO = document.querySelector('#root-o');
document.querySelector('#dispatch-event-ref').addEventListener('click', () => document.dispatchEvent(new CustomEvent('aml-event-ref', {detail: {id: 'selected-42'}})));
document.querySelector('#pause-event-effect').addEventListener('click', () => AMLEngine.pauseEffect(rootO, 'page.eventReader'));
document.querySelector('#resume-event-effect').addEventListener('click', () => AMLEngine.resumeEffect(rootO, 'page.eventReader', true));
document.querySelector('#inspect-event-effect').addEventListener('click', () => {
  document.querySelector('#effect-inspection').value = JSON.stringify(AMLEngine.effects(rootO)['page.eventReader']);
});
document.querySelector('#burst-throttle').addEventListener('click', () => {
  const trigger = document.querySelector('#trigger-throttle');
  for (let index = 0; index < 5; index++) trigger.click();
});
document.querySelector('#simulate-rich-drag').addEventListener('click', () => {
  const items = document.querySelectorAll('#root-q [data-aml-sortable="true"] > li');
  const transfer = new DataTransfer();
  items[0].dispatchEvent(new DragEvent('dragstart', {bubbles: true, dataTransfer: transfer}));
  items[1].dispatchEvent(new DragEvent('drop', {bubbles: true, cancelable: true, dataTransfer: transfer}));
  items[0].dispatchEvent(new DragEvent('dragend', {bubbles: true, dataTransfer: transfer}));
});
rootI.addEventListener('aml:effect-run', () => {
  const output = document.querySelector('#effect-runs');
  output.value = String(Number(output.value) + 1);
});
rootI.addEventListener('aml:effect-cleanup', () => {
  const output = document.querySelector('#effect-cleanups');
  output.value = String(Number(output.value) + 1);
});
document.querySelector('#effect-event').addEventListener('click', () => document.dispatchEvent(new Event('aml-fixture-event')));
document.querySelector('#unmount-effects').addEventListener('click', () => {
  const ticks = rootI.querySelector('[data-aml-bind="ticks"]');
  const cleanups = rootI.querySelector('#effect-cleanups');
  AMLEngine.unmount(rootI);
  document.querySelector('#unmount-ticks').value = ticks.textContent;
  document.querySelector('#unmount-cleanups').value = cleanups.textContent;
});
</script>
</body>
</html>

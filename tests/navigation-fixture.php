<?php

declare(strict_types=1);

require dirname(__DIR__) . '/src/EngineRuntime.php';

use AML\Engine\EngineRuntime;

if (isset($_GET['missing'])) {
    http_response_code(404);
    echo '<!doctype html><title>Missing</title><p>No AML root.</p>';
    exit;
}
if (isset($_GET['failure'])) {
    http_response_code(500);
    echo '<!doctype html><title>Failure</title><p>No AML root.</p>';
    exit;
}
if (isset($_GET['slow'])) {
    usleep(350000);
}
$page = htmlspecialchars((string) ($_GET['page'] ?? 'home'), ENT_QUOTES, 'UTF-8');
?>
<!doctype html>
<html lang="en" data-document-id="<?= bin2hex(random_bytes(6)) ?>"><head><meta charset="utf-8"><title>Navigation <?= $page ?></title><meta name="description" content="Page <?= $page ?>"></head><body>
<main data-aml-client id="navigation-root" tabindex="-1">
  <template data-aml-state="{}" data-aml-state-config="{&quot;shared&quot;:{},&quot;persisted&quot;:{},&quot;types&quot;:{},&quot;computed&quot;:{},&quot;effects&quot;:{}}"></template>
  <section data-aml-context-provider="{&quot;name&quot;:&quot;locale&quot;,&quot;value&quot;:&quot;fr&quot;,&quot;state&quot;:null,&quot;persist&quot;:false}">
    <span data-aml-context-bind="locale">fr</span>
  </section>
  <section data-aml-context-provider="{&quot;name&quot;:&quot;theme&quot;,&quot;value&quot;:&quot;light&quot;,&quot;state&quot;:null,&quot;persist&quot;:false}">
    <span data-aml-context-bind="theme">light</span>
    <button data-aml-theme-choice="light">Light</button><button data-aml-theme-choice="dark">Dark</button>
  </section>
  <div data-aml-navigation-boundary>
    <div data-aml-navigation-content>
      <h1 data-aml-navigation-focus>Page <?= $page ?></h1>
      <a href="/navigation-fixture.php?page=account">Account</a>
      <a href="/navigation-fixture.php?page=slow&amp;slow=1">Slow</a>
      <a href="/navigation-fixture.php?page=fast">Fast</a>
      <a href="/navigation-fixture.php?missing=1">Missing</a>
      <a href="/navigation-fixture.php?failure=1">Failure</a>
    </div>
    <template data-aml-navigation-state="loading"><p>Loading route</p></template>
    <template data-aml-navigation-state="error"><p>Route failed</p></template>
    <template data-aml-navigation-state="not-found"><p>Route missing</p></template>
    <div data-aml-navigation-live aria-live="polite"></div>
  </div>
</main>
<output id="runtime-error"></output>
<script>window.fixtureRan = true; addEventListener('error', event => document.querySelector('#runtime-error').value = event.message);</script>
<?= EngineRuntime::script() ?>
</body></html>

import { test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

test('records Engine browser operation baselines', async ({ page, browserName }) => {
  await page.goto('/browser-fixture.php');

  const results = await page.evaluate(async () => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
    const measureClicks = async (selector, iterations) => {
      const element = document.querySelector(selector);
      const start = performance.now();
      for (let index = 0; index < iterations; index++) {
        element.click();
        await Promise.resolve();
      }
      await frame();
      return (performance.now() - start) / iterations;
    };

    const counter = await measureClicks('#increment-b', 100);
    const transaction = await measureClicks('#run-transaction', 50);
    const collection = await measureClicks('#stress-update', 20);

    const formRoot = document.createElement('section');
    formRoot.dataset.amlClient = '';
    formRoot.innerHTML = '<template data-aml-state="{&quot;name&quot;:&quot;&quot;}" data-aml-state-config="{&quot;shared&quot;:{},&quot;persisted&quot;:{},&quot;types&quot;:{&quot;name&quot;:&quot;string&quot;}}"></template><input data-aml-model="name"><output data-aml-bind="name"></output>';
    document.body.append(formRoot);
    window.AMLEngine.mount(formRoot);
    const input = formRoot.querySelector('input');
    const formStart = performance.now();
    for (let index = 0; index < 100; index++) {
      input.value = `Value ${index}`;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    }
    await frame();
    const form = (performance.now() - formStart) / 100;

    const effectButton = document.querySelector('#effect-source');
    const effectStart = performance.now();
    for (let index = 1; index <= 10; index++) {
      effectButton.click();
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    const effect = (performance.now() - effectStart) / 10;

    return {
      counter_update_ms: counter,
      transaction_ms: transaction,
      collection_1000_reverse_ms: collection,
      form_input_ms: form,
      debounced_effect_ms: effect,
    };
  });

  const report = {
    generated_at: new Date().toISOString(),
    environment: { browser: browserName, engine: process.version, os: process.platform, machine: process.arch },
    iterations: { counter: 100, transaction: 50, collection: 20, form: 100, effect: 10 },
    results: Object.fromEntries(Object.entries(results).map(([key, value]) => [key, Number(value.toFixed(6))])),
  };
  const output = resolve(process.cwd(), '../../../benchmarks/results/engine-browser-latest.json');
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report));
});

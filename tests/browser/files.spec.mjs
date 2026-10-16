import {assetFile, viewFile} from './test-environment.mjs';
import {browserRuntime} from './runtime-source.mjs';
import {expect, test} from './runtime-test.mjs';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const runtime = browserRuntime(readFileSync(assetFile('engine.js'), 'utf8'));
const fixture = viewFile('tests/browser-files.php');
const html = (argument = '--html') => execFileSync(process.env.PHP_BINARY || 'php', [fixture, argument], {encoding: 'utf8'});
const setup = async (page, argument) => {
  await page.route('**/local-files', (route) => route.fulfill({contentType: 'text/html', body: `<!doctype html><meta charset="utf-8"><main data-aml-client>${html(argument)}</main><script>${runtime}</script>`}));
  await page.goto('/local-files');
  await expect(page.locator('[data-aml-client]').first()).toHaveAttribute('data-aml-engine-mounted', 'true');
  await page.evaluate(() => {
    window.fileEvents = [];
    for (const event of ['aml:file-success', 'aml:file-error']) document.querySelector('main').addEventListener(event, ({type, detail}) => window.fileEvents.push({type, ...detail, error: detail.error?.message}));
  });
};
const file = (name, content) => ({name, mimeType: 'application/octet-stream', buffer: Buffer.isBuffer(content) ? content : Buffer.from(content)});
const state = (page) => page.evaluate(() => AMLEngine.inspect(document.querySelector('main')));
const download = async (page, label) => {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', {name: label, exact: true}).click();
  const result = await pending;
  return {name: result.suggestedFilename(), text: readFileSync(await result.path(), 'utf8')};
};
const delayedReader = async (page) => page.evaluate(() => {
  const NativeReader = window.FileReader;
  window.readAborts = 0;
  window.FileReader = class extends NativeReader {
    readAsArrayBuffer(file) { this.timer = setTimeout(() => super.readAsArrayBuffer(file), file.name.startsWith('slow') ? 350 : 0); }
    abort() { clearTimeout(this.timer); window.readAborts++; super.abort(); }
  };
});

test('real View JSON import, PHP transformation, persistence and download stay local', async ({page}) => {
  await setup(page);
  const requests = []; page.on('request', (request) => requests.push(request.url()));
  await page.locator('#profil-file').setInputFiles(file('profil.json', '{"name":"Camille","age":28,"$state":"literal"}'));
  await page.getByRole('button', {name: 'Importer le JSON', exact: true}).click();
  await expect(page.locator('#nom-affiche')).toHaveText('Nom : Camille');
  await page.getByRole('button', {name: 'Passer le nom en majuscules'}).click();
  await expect(page.locator('#nom-affiche')).toHaveText('Nom : CAMILLE');
  const saved = await download(page, 'Télécharger le JSON');
  expect(saved.name).toBe('profil.json');
  expect(JSON.parse(saved.text)).toEqual({name: 'CAMILLE', age: 28, '$state': 'literal'});
  expect(requests).toEqual([]);
  await page.reload();
  await expect(page.locator('#nom-affiche')).toHaveText('Nom : CAMILLE');
  expect(await page.locator('#profil-file').inputValue()).toBe('');
});

test('text and CSV selections display safely and export their edited values', async ({page}) => {
  await setup(page);
  const content = 'Bonjour André\n<script>window.injected=1</script>';
  await page.locator('#texte-file').setInputFiles(file('notes.txt', content));
  await expect(page.locator('#texte-affiche')).toHaveText(content);
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  const metadata = (await state(page)).fichiers;
  expect(metadata[0].name).toBe('notes.txt'); expect(metadata[0].size).toBe(Buffer.byteLength(content));
  expect(Object.keys(metadata[0]).sort()).toEqual(['lastModified', 'name', 'size', 'type']);
  await page.getByRole('button', {name: 'Ajouter une ligne', exact: true}).click();
  expect((await download(page, 'Télécharger le texte')).text).toBe(content + '\nUne nouvelle ligne.');
  await page.locator('#csv-file').setInputFiles(file('data.csv', '\ufeffnom,note\r\nAndré,"a,""b""\nc"\r\n'));
  await expect(page.locator('#csv-compte')).toHaveText('Lignes CSV : 2');
  expect((await state(page)).lignes).toEqual([['nom', 'note'], ['André', 'a,"b"\nc']]);
  await page.getByRole('button', {name: 'Ajouter une ligne CSV'}).click();
  const saved = await download(page, 'Télécharger le CSV');
  expect(saved.name).toBe('tableau.csv');
  expect(saved.text).toBe('"nom","note"\r\n"André","a,""b""\nc"\r\n"André","Montréal"\r\n');
  await expect(page.locator('#lecture-etat')).toHaveText('Prêt');
});

test('missing, malformed, unsafe, wrong-typed and oversized files retain previous data and recover', async ({page}) => {
  await setup(page);
  await page.getByRole('button', {name: 'Importer le JSON', exact: true}).click();
  await expect(page.locator('#erreur-affiche')).toContainText('No file selected');
  for (const content of ['{', '{"__proto__":{}}', '{"id":9007199254740993}', 'null', 'true', '3', ' '.repeat(1048577), Buffer.from([0xff])]) {
    await page.locator('#profil-file').setInputFiles(file('invalid.json', content));
    await page.getByRole('button', {name: 'Importer le JSON', exact: true}).click();
    await expect(page.locator('#erreur-affiche')).not.toHaveText('');
    expect((await state(page)).profil).toEqual({name: 'André', age: 30});
    await expect(page.locator('#lecture-etat')).toHaveText('Prêt');
    await expect(page.getByRole('button', {name: 'Importer le JSON', exact: true})).toBeEnabled();
  }
  await page.locator('#profil-file').setInputFiles(file('good.json', '{"name":"Réussi"}'));
  await page.getByRole('button', {name: 'Importer le JSON', exact: true}).click();
  await expect(page.locator('#nom-affiche')).toHaveText('Nom : Réussi');
  await expect(page.locator('#erreur-affiche')).toHaveText('');
  await page.locator('#csv-file').setInputFiles(file('bad.csv', '"unclosed'));
  await expect(page.locator('#erreur-affiche')).toContainText('Unterminated CSV');
  expect((await state(page)).lignes).toEqual([]);
});

test('same file input names remain isolated in repeated components', async ({page}) => {
  await setup(page, '--children');
  const inputs = page.locator('input[type=file]');
  await inputs.nth(1).setInputFiles(file('second.txt', 'SECOND'));
  await expect.poll(async () => Object.values((await state(page)).components.FileChild).map((value) => value.text)).toEqual(['', 'SECOND']);
  await inputs.nth(0).setInputFiles(file('first.txt', 'FIRST'));
  await expect.poll(async () => Object.values((await state(page)).components.FileChild).map((value) => value.text)).toEqual(['FIRST', 'SECOND']);
});

test('latest selection cancels previous reads; unmount cancels pending work', async ({page}) => {
  await setup(page); await delayedReader(page);
  await page.evaluate(() => {
    const input = document.querySelector('#texte-file');
    input.dataset.amlClientChange = JSON.stringify({type: 'sequence', actions: [JSON.parse(input.dataset.amlClientChange), {type: 'increment', target: 'completedReads', value: 1}]});
  });
  await page.locator('#texte-file').setInputFiles(file('slow-old.txt', 'OLD'));
  await expect(page.locator('#lecture-etat')).toHaveText('Lecture en cours…');
  await page.locator('#texte-file').setInputFiles(file('new.txt', 'NEW'));
  await expect(page.locator('#texte-affiche')).toHaveText('NEW');
  await page.waitForTimeout(450);
  expect((await state(page)).texte).toBe('NEW');
  expect((await state(page)).completedReads).toBe(1);
  expect(await page.evaluate(() => window.readAborts)).toBe(1);
  expect(await page.evaluate(() => window.fileEvents.filter((e) => e.type === 'aml:file-success').length)).toBe(1);
  await page.locator('#texte-file').setInputFiles(file('slow-unmount.txt', 'LATE'));
  await expect(page.locator('#lecture-etat')).toHaveText('Lecture en cours…');
  await page.evaluate(() => AMLEngine.unmount(document.querySelector('main')));
  await page.waitForTimeout(450);
  expect(await page.evaluate(() => window.readAborts)).toBe(2);
  expect(await page.evaluate(() => window.fileEvents.filter((e) => e.type === 'aml:file-success').length)).toBe(1);
  expect(await page.locator('#texte-file').getAttribute('aria-busy')).toBeNull();
});

test('new components in Each lists receive isolated file sources', async ({page}) => {
  await setup(page, '--dynamic');
  await page.getByRole('button', {name: 'Add', exact: true}).click();
  await page.getByRole('button', {name: 'Add', exact: true}).click();
  const inputs = page.locator('input[type=file]');
  await expect(inputs).toHaveCount(2);
  expect(await inputs.nth(0).getAttribute('data-aml-file-source')).not.toBe(await inputs.nth(1).getAttribute('data-aml-file-source'));
  await inputs.nth(1).setInputFiles(file('second.txt', 'SECOND'));
  await expect(page.locator('li').nth(1)).toHaveText('SECOND');
  await expect(page.locator('li').nth(0)).toHaveText('');
  await inputs.nth(0).setInputFiles(file('first.txt', 'FIRST'));
  await expect(page.locator('li').nth(0)).toHaveText('FIRST');
  await expect(page.locator('li').nth(1)).toHaveText('SECOND');
});

test('parallel sources share loading state until both reads finish', async ({page}) => {
  await setup(page); await delayedReader(page);
  await page.locator('#texte-file').setInputFiles(file('slow-text.txt', 'TEXT'));
  await page.locator('#csv-file').setInputFiles(file('fast.csv', 'one,two'));
  await expect(page.locator('#csv-compte')).toHaveText('Lignes CSV : 1');
  await expect(page.locator('#lecture-etat')).toHaveText('Lecture en cours…');
  await expect(page.locator('#texte-affiche')).toHaveText('TEXT');
  await expect(page.locator('#lecture-etat')).toHaveText('Prêt');
});

test('reads compose in sequences, stop on failure, and reject explicit transactions', async ({page}) => {
  await setup(page);
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Importer le JSON');
    const read = JSON.parse(button.dataset.amlClientClick);
    window.readAction = read;
    button.dataset.amlClientClick = JSON.stringify({type: 'sequence', actions: [read, {type: 'set', target: 'texte', value: {$state: 'profil.name'}}]});
    window.actionErrors = []; document.querySelector('main').addEventListener('aml:error', ({detail}) => window.actionErrors.push(detail.error.message));
  });
  await page.locator('#profil-file').setInputFiles(file('good.json', '{"name":"AFTER"}'));
  await page.getByRole('button', {name: 'Importer le JSON', exact: true}).click();
  await expect(page.locator('#texte-affiche')).toHaveText('AFTER');
  await page.locator('#profil-file').setInputFiles(file('bad.json', '{'));
  await page.getByRole('button', {name: 'Importer le JSON', exact: true}).click();
  await expect(page.locator('#erreur-affiche')).not.toHaveText('');
  expect((await state(page)).texte).toBe('AFTER');
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Importer le JSON');
    button.dataset.amlClientClick = JSON.stringify({type: 'transaction', actions: [window.readAction]});
  });
  await page.getByRole('button', {name: 'Importer le JSON', exact: true}).click();
  await expect.poll(() => page.evaluate(() => window.actionErrors.at(-1))).toContain('cannot run inside a state transaction');
});

test('file index selection, ambiguous inputs, and Blob URL cleanup are enforced', async ({page}) => {
  await setup(page);
  await page.evaluate(() => {
    const input = document.querySelector('#texte-file'); input.multiple = true;
    const action = JSON.parse(input.dataset.amlClientChange); action.index = 1; input.dataset.amlClientChange = JSON.stringify(action);
    const native = URL.revokeObjectURL.bind(URL); window.revoked = [];
    URL.revokeObjectURL = (url) => { window.revoked.push(url); native(url); };
  });
  await page.locator('#texte-file').setInputFiles([file('one.txt', 'ONE'), file('two.txt', 'TWO')]);
  await expect(page.locator('#texte-affiche')).toHaveText('TWO');
  expect((await download(page, 'Télécharger le texte')).text).toBe('TWO');
  await expect.poll(() => page.evaluate(() => window.revoked.length)).toBe(1);
  await page.evaluate(() => {
    const input = document.querySelector('#profil-file'); const duplicate = input.cloneNode(); duplicate.id = 'duplicate'; input.after(duplicate);
  });
  await page.getByRole('button', {name: 'Importer le JSON', exact: true}).click();
  await expect(page.locator('#erreur-affiche')).toContainText('ambiguous');
});

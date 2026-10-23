import {assetFile, engineTag, viewFile} from './test-environment.mjs';
import {browserRuntime} from './runtime-source.mjs';
import {expect, test} from './runtime-test.mjs';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const fixture = viewFile('tests/compatibility-program.php');
const samples = JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [fixture, '--json'], {encoding: 'utf8', maxBuffer: 32 * 1024 * 1024}));
const runtime = browserRuntime(readFileSync(assetFile('engine-0.1.0-beta.10.min.js'), 'utf8'));
for (const sample of samples) test(`combined compatibility program: ${sample.variant}`, async ({page}) => {
    const errors = [], logs = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {if (message.type() === 'log') logs.push(message.text());});
    await page.route('**/compatibility-program', route => route.fulfill({contentType: 'text/html', headers: {'Content-Security-Policy': "default-src 'none'; img-src 'self'; script-src 'self'; style-src 'unsafe-inline'"}, body: '<!doctype html><meta charset="utf-8"><link rel="icon" href="/favicon.ico"><main data-aml-client>' + sample.html + '</main>' + engineTag}));
    await page.route('**/engine-0.1.0-beta.10.min.js', route => route.fulfill({body: runtime, contentType: 'text/javascript'}));
    await page.addInitScript(() => {window.violations = []; document.addEventListener('securitypolicyviolation', event => window.violations.push(event.blockedURI));});
    await page.goto('/compatibility-program');
    await expect(page.locator('[data-aml-client]').first()).toHaveAttribute('data-aml-engine-mounted', 'true');
    const button = page.getByRole('button', {name: 'Préparer le catalogue'});
    await button.click();
    if (sample.variant === 'valid') { await expect(page.locator('#resume-catalogue')).toHaveText('2 articles · 40,00 $ · 2026-10-15'); }
    else { await expect(page.locator('#erreur-catalogue')).toContainText(sample.expected.erreur.split(' : ')[0]); }
    await button.click();
    if (sample.variant === 'valid') {
        await expect.poll(() => logs.join('')).toBe(sample.output);
        await expect(page.locator('#export-catalogue')).toHaveText(sample.expected.export);
        // Exercise a real bound input after successful rendering, then recover.
        await page.locator('#source-catalogue').fill('{');
        await button.click();
        await expect(page.locator('#erreur-catalogue')).toContainText('JsonException');
        await expect(page.locator('#resume-catalogue')).toHaveText(sample.expected.message);
        await page.locator('#source-catalogue').fill(sample.initial.source);
        await button.click();
        await expect(page.locator('#erreur-catalogue')).toHaveText('');
        await expect.poll(() => logs.length).toBe(3);
    }
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => window.violations)).toEqual([]);
});

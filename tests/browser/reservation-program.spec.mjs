import {assetFile, engineTag, viewFile} from './test-environment.mjs';
import {browserRuntime} from './runtime-source.mjs';
import {expect, test} from './runtime-test.mjs';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const fixture = viewFile('tests/reservation-program.php');
const samples = JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [fixture, '--json'], {encoding: 'utf8', maxBuffer: 32 * 1024 * 1024}));
const runtime = browserRuntime(readFileSync(assetFile('engine-0.1.0-beta.10.min.js'), 'utf8'));
for (const sample of samples) test(`reservation program: ${sample.variant}`, async ({page}) => {
    const errors = [], logs = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {if (message.type() === 'log') logs.push(message.text());});
    await page.route('**/reservation-program', route => route.fulfill({contentType: 'text/html', headers: {'Content-Security-Policy': "default-src 'none'; img-src 'self'; script-src 'self'; style-src 'unsafe-inline'"}, body: '<!doctype html><meta charset="utf-8"><link rel="icon" href="/favicon.ico"><main data-aml-client>' + sample.html + '</main>' + engineTag}));
    await page.route('**/engine-0.1.0-beta.10.min.js', route => route.fulfill({body: runtime, contentType: 'text/javascript'}));
    await page.addInitScript(() => {window.violations = []; window.engineErrors = []; document.addEventListener('securitypolicyviolation', event => window.violations.push(event.blockedURI)); document.addEventListener('aml:error', event => window.engineErrors.push(event.detail.error.message), true);});
    await page.goto('/reservation-program');
    await expect(page.locator('[data-aml-client]').first()).toHaveAttribute('data-aml-engine-mounted', 'true');
    const button = page.getByRole('button', {name: 'Préparer la réservation'});
    await button.click();
    await expect(page.locator('#resume-reservation')).toHaveText(sample.expected.message);
    await expect(page.locator('#erreur-reservation')).toHaveText(sample.expected.erreur);
    await button.click();
    await expect(page.locator('#export-reservation')).toHaveText(sample.expected.export);
    await expect.poll(() => logs.join('')).toBe(sample.output);
    if (sample.variant === 'valid') {
        await page.getByLabel('Courriel', {exact: true}).fill('invalide');
        await button.click();
        await expect(page.locator('#erreur-reservation')).toHaveText('Adresse courriel invalide.');
        await expect(page.locator('#resume-reservation')).toHaveText(sample.expected.message);
        await page.getByLabel('Courriel', {exact: true}).fill(sample.initial.email);
        await page.getByLabel('Nombre de nuits', {exact: true}).fill('2');
        await button.click();
        await expect(page.locator('#erreur-reservation')).toHaveText('');
        await expect(page.locator('#resume-reservation')).toHaveText('2026-10-15 → 2026-10-17 · 25,00 $');
        await expect.poll(() => logs.length).toBe(3);
    }
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => window.engineErrors)).toEqual([]);
    expect(await page.evaluate(() => window.violations)).toEqual([]);
});

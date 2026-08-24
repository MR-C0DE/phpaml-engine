import test from 'node:test';
import assert from 'node:assert/strict';

import { migrateValue, persistedPayload, restoredValue } from '../src-js/storage.js';

const root = () => new EventTarget();

test('serializes versioned persisted values', () => {
  const parsed = JSON.parse(persistedPayload({version: 3}, {theme: 'dark'}));
  assert.equal(parsed.__amlPersisted, true);
  assert.equal(parsed.version, 3);
  assert.deepEqual(parsed.value, {theme: 'dark'});
  assert.equal(typeof parsed.savedAt, 'number');
});

test('applies deterministic rename, default and removal migrations', () => {
  const migrated = migrateValue(root(), 'profile', {name: 'Ada', obsolete: true}, 1, {
    version: 2,
    migrations: {2: {rename: {name: 'displayName'}, defaults: {locale: 'fr'}, remove: ['obsolete']}},
  });
  assert.deepEqual(migrated, {displayName: 'Ada', locale: 'fr'});
});

test('keeps the fallback when a migration is missing or data is expired', () => {
  assert.equal(migrateValue(root(), 'profile', {name: 'Ada'}, 1, {version: 2}), undefined);
  const expired = JSON.stringify({__amlPersisted: true, version: 1, savedAt: 1, value: 'old'});
  assert.equal(restoredValue(root(), 'draft', {version: 1, expiresAfter: 1}, expired, 'string'), undefined);
});

test('coerces legacy and current persisted values', () => {
  assert.equal(restoredValue(root(), 'count', {version: 1}, '"12"', 'int'), 12);
  const current = JSON.stringify({__amlPersisted: true, version: 1, savedAt: Date.now(), value: 'true'});
  assert.equal(restoredValue(root(), 'enabled', {version: 1}, current, 'bool'), true);
});

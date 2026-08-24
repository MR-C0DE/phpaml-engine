import { clone, coerce, deletePath, readPath, writePath } from './core/state.js';

export const migrateValue = (root, target, value, storedVersion, config) => {
  let migrated = clone(value);
  for (let version = Number(storedVersion) + 1; version <= Number(config.version || 1); version++) {
    const migration = config.migrations?.[version] || config.migrations?.[String(version)];
    if (!migration) {
      root.dispatchEvent(new CustomEvent('aml:storage-migration-required', {detail: {target, storedVersion, expectedVersion: config.version || 1, missingVersion: version}}));
      return undefined;
    }
    Object.entries(migration.rename || {}).forEach(([from, to]) => {
      const previous = readPath(migrated, from);
      if (previous !== undefined) { writePath(migrated, to, previous); deletePath(migrated, from); }
    });
    Object.entries(migration.defaults || {}).forEach(([path, fallback]) => {
      if (readPath(migrated, path) === undefined) writePath(migrated, path, fallback);
    });
    (migration.remove || []).forEach((path) => deletePath(migrated, path));
  }
  root.dispatchEvent(new CustomEvent('aml:storage-migrated', {detail: {target, from: storedVersion, to: config.version || 1}}));
  return migrated;
};

export const openStateDatabase = () => new Promise((resolve, reject) => {
  const request = indexedDB.open('phpaml-engine', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('state');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

export const indexedState = async (operation, key, value = undefined) => {
  const database = await openStateDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction('state', operation === 'get' ? 'readonly' : 'readwrite');
      const store = transaction.objectStore('state');
      const request = operation === 'get' ? store.get(key) : (operation === 'delete' ? store.delete(key) : store.put(value, key));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally { database.close(); }
};

export const persistedPayload = (config, value) => JSON.stringify({
  __amlPersisted: true,
  version: Number(config.version || 1),
  savedAt: Date.now(),
  value,
});

export const restoredValue = (root, target, config, serialized, type) => {
  const parsed = JSON.parse(serialized);
  if (!parsed || parsed.__amlPersisted !== true) return coerce(type, parsed);
  if (Number(parsed.version) > Number(config.version || 1)) {
    root.dispatchEvent(new CustomEvent('aml:storage-version-newer', {detail: {target, storedVersion: parsed.version, expectedVersion: config.version || 1}}));
    return undefined;
  }
  if (config.expiresAfter && Date.now() - Number(parsed.savedAt || 0) > Number(config.expiresAfter) * 1000) {
    root.dispatchEvent(new CustomEvent('aml:storage-expired', {detail: {target}}));
    return undefined;
  }
  const value = Number(parsed.version) < Number(config.version || 1)
    ? migrateValue(root, target, parsed.value, parsed.version, config)
    : parsed.value;
  return value === undefined ? undefined : coerce(type, value);
};

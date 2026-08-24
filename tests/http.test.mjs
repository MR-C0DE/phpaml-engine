import test from 'node:test';
import assert from 'node:assert/strict';

import { csrfToken, prepareApiRequest, refreshCsrfToken } from '../src-js/http.js';

const metaDocument = (initial = '') => {
  const meta = {
    value: initial,
    getAttribute: () => meta.value,
    setAttribute: (_, value) => { meta.value = value; },
  };
  return {meta, document: {querySelector: () => meta}};
};

test('reads and renews CSRF metadata', () => {
  const fixture = metaDocument('initial-token');
  assert.equal(csrfToken(fixture.document), 'initial-token');
  refreshCsrfToken({headers: {get: () => 'renewed-token'}}, fixture.document);
  assert.equal(csrfToken(fixture.document), 'renewed-token');
});

test('keeps GET requests free of CSRF headers and bodies', () => {
  const url = new URL('https://example.test/api');
  const signal = new AbortController().signal;
  const options = prepareApiRequest(url, {method: 'GET'}, {query: 'AML', empty: null}, signal, 'secret');
  assert.equal(url.searchParams.get('query'), 'AML');
  assert.equal(url.searchParams.get('empty'), '');
  assert.equal(options.headers['X-CSRF-Token'], undefined);
  assert.equal(options.body, undefined);
});

test('adds JSON and CSRF metadata to mutations', () => {
  const url = new URL('https://example.test/api');
  const options = prepareApiRequest(url, {method: 'POST'}, {name: 'Ada'}, null, 'csrf-token');
  assert.equal(options.credentials, 'same-origin');
  assert.equal(options.headers['Content-Type'], 'application/json');
  assert.equal(options.headers['X-CSRF-Token'], 'csrf-token');
  assert.equal(options.body, '{"name":"Ada"}');
});

test('labels remote validation independently without inventing a token', () => {
  const options = prepareApiRequest(new URL('https://example.test/validate'), {method: 'POST'}, {value: 'a'}, null, '', 'validation');
  assert.equal(options.headers['X-AML-Engine'], 'validation');
  assert.equal(options.headers['X-CSRF-Token'], undefined);
});

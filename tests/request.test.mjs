import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = new URL('https://example.test/app');
globalThis.HTMLButtonElement = class {};
globalThis.addEventListener = () => {};
globalThis.document = {
  querySelector: () => null,
  addEventListener: () => {},
};
globalThis.CustomEvent = class {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
};

const { request } = await import('../src-js/actions-runtime.js');

test('retries a transient GET failure and reports the attempt count', async () => {
  const originalFetch = globalThis.fetch;
  const events = [];
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls === 1) {
      return new Response(JSON.stringify({message: 'temporary'}), {
        status: 503,
        headers: {'content-type': 'application/json'},
      });
    }
    return new Response(JSON.stringify({ok: true}), {
      status: 200,
      headers: {'content-type': 'application/json'},
    });
  };

  try {
    await request(
      {dispatchEvent: (event) => events.push(event)},
      {},
      {type: 'api', method: 'GET', url: '/api/retry', data: {}, retries: 1, retryDelay: 0},
      null,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls, 2);
  assert.equal(events.filter((event) => event.type === 'aml:api-retry').length, 1);
  assert.equal(events.find((event) => event.type === 'aml:api-success').detail.attempts, 2);
});

test('does not retry a client error', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(JSON.stringify({message: 'invalid'}), {
      status: 422,
      headers: {'content-type': 'application/json'},
    });
  };

  try {
    await request(
      {dispatchEvent: () => {}},
      {},
      {type: 'api', method: 'GET', url: '/api/invalid', data: {}, retries: 3, retryDelay: 0},
      null,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls, 1);
});

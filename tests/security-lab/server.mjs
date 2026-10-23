import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {resolve} from 'node:path';
import {viewRoot, engineRoot} from '../browser/test-environment.mjs';

// Both origins belong to this test; never accepts a remote target.
export const startSecurityLab = async ({diagnostic = false} = {}) => {
  const received = [];
  const receiver = createServer(async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, X-AML-Engine, X-AML-Navigation');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    received.push({path: request.url, method: request.method, body: Buffer.concat(chunks).toString(), token: request.headers['x-csrf-token']});
    if (request.url === '/code.js') { response.setHeader('Content-Type', 'text/javascript'); response.end('window.labExecuted=true;'); return; }
    if (request.url === '/foreign-page') { response.setHeader('Content-Type', 'text/html'); response.end('<main data-aml-client><p id="foreign-content">Foreign content</p></main>'); return; }
    response.setHeader('Content-Type', 'application/json'); response.end('{"message":"received"}');
  }).listen(0, '127.0.0.1');
  await once(receiver, 'listening'); const foreign = `http://127.0.0.1:${receiver.address().port}`;
  const reserved = createServer().listen(0, '127.0.0.1'); await once(reserved, 'listening');
  const port = reserved.address().port; await new Promise(done => reserved.close(done));
  const origin = `http://127.0.0.1:${port}`;
  const php = spawn(process.env.PHP_BINARY || 'php', ['-S', `127.0.0.1:${port}`, '-t', resolve(engineRoot, 'tests/security-lab/public'), resolve(engineRoot, 'tests/security-lab/router.php')], {
    env: {...process.env, PHPAML_ENGINE_ROOT: engineRoot, PHPAML_VIEW_ROOT: viewRoot, PHPAML_LAB_RECEIVER: foreign, PHPAML_LAB_DIAGNOSTIC: diagnostic ? '1' : '0', PHP_CLI_SERVER_WORKERS: '2'},
    stdio: 'ignore', detached: process.platform !== 'win32',
  });
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(origin + '/ready')).ok) { ready = true; break; } } catch {}
    await new Promise(done => setTimeout(done, 50));
  }
  const close = async () => {
    if (php?.pid) { try { process.kill(process.platform === 'win32' ? php.pid : -php.pid, 'SIGTERM'); } catch {} }
    receiver.closeAllConnections(); await new Promise(done => receiver.close(done));
  };
  if (!ready) { await close(); throw new Error('Security lab startup failed'); }
  return {origin, foreign, received, close};
};

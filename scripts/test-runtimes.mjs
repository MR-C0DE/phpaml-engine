import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const project = fileURLToPath(new URL('..', import.meta.url));
for (const runtime of ['full', 'modules']) {
  console.log(`\nChecking the ${runtime} runtime`);
  const result = spawnSync(process.execPath, ['node_modules/playwright/cli.js', 'test', ...process.argv.slice(2)], {
    cwd: project, stdio: 'inherit', env: {...process.env, PHPAML_BROWSER_RUNTIME: runtime},
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

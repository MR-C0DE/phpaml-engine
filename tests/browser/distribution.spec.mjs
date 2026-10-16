import {test, expect} from './runtime-test.mjs';
import {readFileSync} from 'node:fs';
import {assetFile, taskBaseURL} from './test-environment.mjs';

test('all installed public assets are served intact with the expected content type', async ({request}) => {
  const files = JSON.parse(readFileSync(assetFile('public-assets.json'), 'utf8'));
  for (const file of files) {
    const response = await request.get(`${taskBaseURL}/_aml/${file}`);
    expect(response.status(), file).toBe(200);
    expect(response.headers()['content-type'], file).toContain(file.endsWith('.map') ? 'application/json' : 'text/javascript');
    expect(Buffer.compare(await response.body(), readFileSync(assetFile(file))), file).toBe(0);
  }
});

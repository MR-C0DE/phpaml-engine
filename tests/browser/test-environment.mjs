import {existsSync, readFileSync} from 'node:fs';
import {resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

export const engineRoot = resolve(process.env.PHPAML_ENGINE_ROOT || fileURLToPath(new URL('../..', import.meta.url)));
export const viewRoot = resolve(process.env.PHPAML_VIEW_ROOT || resolve(engineRoot, '../phpaml-view'));
export const runtimeMode = process.env.PHPAML_BROWSER_RUNTIME || 'full';
if (!['full', 'modules'].includes(runtimeMode)) throw new Error('PHPAML_BROWSER_RUNTIME must be full or modules.');
export const engineVersion = JSON.parse(readFileSync(resolve(engineRoot, 'composer.json'), 'utf8')).extra.phpaml.version;
export const baseURL = `http://127.0.0.1:${process.env.PHPAML_TEST_PORT || 8097}`;
export const taskBaseURL = `http://127.0.0.1:${process.env.PHPAML_TASKS_PORT || 8120}`;
export const assetFile = filename => resolve(engineRoot, 'assets', filename);
export const viewFile = relative => {
  const path = resolve(viewRoot, relative);
  if (!existsSync(path)) throw new Error(`Required View test input is missing: ${path}. Check out the matching phpaml-view repository or set PHPAML_VIEW_ROOT.`);
  return relative.endsWith('/') ? path + sep : path;
};
export const engineSource = `/_aml/${runtimeMode === 'modules' ? `modules-${engineVersion}.min/engine.js` : `engine-${engineVersion}.min.js`}`;
export const engineTag = `<script ${runtimeMode === 'modules' ? 'type="module"' : 'defer'} data-aml-engine src="${engineSource}"></script>`;

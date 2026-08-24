import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const composer = JSON.parse(await readFile(resolve(project, 'composer.json'), 'utf8'));
const version = composer.extra.phpaml.version;
const phpRuntime = await readFile(resolve(project, 'src/EngineRuntime.php'), 'utf8');
const phpVersion = phpRuntime.match(/public const VERSION = '([^']+)'/)?.[1];
if (phpVersion !== version) throw new Error(`Engine version mismatch: composer=${version}, php=${phpVersion || 'missing'}`);

const compile = async (minify, sourcemap) => build({
  absWorkingDir: project,
  entryPoints: ['src-js/index.js'],
  bundle: true,
  write: false,
  minify,
  sourcemap,
  outfile: `assets/engine-${version}${minify ? '.min' : ''}.js`,
  format: 'iife',
  target: ['es2020'],
  banner: {js: 'if (!window.AMLEngine) {'},
  footer: {js: '}'},
});

const regular = await compile(false, false);
const minified = await compile(true, 'external');
const regularCode = regular.outputFiles.find((file) => file.path.endsWith('.js')).text;
const minifiedFile = minified.outputFiles.find((file) => file.path.endsWith('.js'));
const mapFile = minified.outputFiles.find((file) => file.path.endsWith('.map'));
const minifiedCode = `${minifiedFile.text.trimEnd()}\n//# sourceMappingURL=engine-${version}.min.js.map\n`;
const outputs = new Map([
  [resolve(project, 'assets/engine.js'), regularCode],
  [resolve(project, `assets/engine-${version}.js`), regularCode],
  [resolve(project, `assets/engine-${version}.min.js`), minifiedCode],
  [resolve(project, `assets/engine-${version}.min.js.map`), mapFile.text],
]);

if (process.argv.includes('--check')) {
  for (const [path, expected] of outputs) {
    if (await readFile(path, 'utf8').catch(() => null) !== expected) throw new Error(`Generated asset is stale: ${path}`);
  }
} else {
  await Promise.all([...outputs].map(([path, contents]) => writeFile(path, contents, 'utf8')));
}

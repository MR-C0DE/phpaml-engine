import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';
import {buildModules} from './modular-build.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const composer = JSON.parse(await readFile(resolve(project, 'composer.json'), 'utf8'));
const version = composer.extra.phpaml.version;
const phpRuntime = await readFile(resolve(project, 'src/EngineRuntime.php'), 'utf8');
const phpVersion = phpRuntime.match(/public const VERSION = '([^']+)'/)?.[1];
if (phpVersion !== version) throw new Error(`Engine version mismatch: composer=${version}, php=${phpVersion || 'missing'}`);

const jsVersion = (await readFile(resolve(project, 'src-js/core/version.js'), 'utf8')).match(/ENGINE_VERSION = '([^']+)'/)?.[1];
if (jsVersion !== version) throw new Error(`Engine browser version mismatch: composer=${version}, JavaScript=${jsVersion || 'missing'}`);

const compile = async (minify, sourcemap, optional = false) => build({
  absWorkingDir: project,
  entryPoints: [optional ? 'src-js/eval-entry.js' : 'src-js/index.js'],
  bundle: true,
  write: false,
  minify,
  sourcemap,
  outfile: `assets/engine-${optional ? 'eval-' : ''}${version}${minify ? '.min' : ''}.js`,
  format: 'iife',
  target: ['es2020'],
  // php-parser uses process.arch only to select its integer lexer limit.
  // Engine separately enforces JavaScript-safe integers in compiled expressions.
  define: optional ? {'process.arch': '"x64"'} : {},
  banner: {js: optional ? 'if (!globalThis.AMLPhpEval) {' : 'if (!window.AMLEngine?.mount) {'},
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
const parserRegular = await compile(false, false, true);
const parserMinified = await compile(true, 'external', true);
outputs.set(resolve(project, `assets/engine-eval-${version}.js`), parserRegular.outputFiles[0].text);
for (const file of parserMinified.outputFiles) outputs.set(file.path, file.path.endsWith('.js')
  ? `${file.text.trimEnd()}\n//# sourceMappingURL=engine-eval-${version}.min.js.map\n` : file.text);

const modular = {};
for (const minify of [false, true]) {
  const result = await buildModules(project, version, minify);
  for (const file of result.files) outputs.set(file.path, file.text);
  modular[minify ? 'minified' : 'development'] = result.metadata;
}
outputs.set(resolve(project, 'assets/module-build.json'), JSON.stringify(modular, null, 2) + '\n');
outputs.set(resolve(project, 'assets/public-assets.json'), JSON.stringify([...outputs.keys()]
  .filter(path => /\.js(?:\.map)?$/.test(path)).map(path => path.slice(resolve(project, 'assets').length + 1)).sort(), null, 2) + '\n');

if (process.argv.includes('--check')) {
  for (const [path, expected] of outputs) {
    if (await readFile(path, 'utf8').catch(() => null) !== expected) throw new Error(`Generated asset is stale: ${path}`);
  }
} else {
  const previous = JSON.parse(await readFile(resolve(project, 'assets/public-assets.json'), 'utf8').catch(() => '[]'));
  await Promise.all([...outputs].map(async ([path, contents]) => {await mkdir(dirname(path), {recursive: true}); await writeFile(path, contents, 'utf8');}));
  for (const filename of previous) {
    if (![`${'modules-' + version}/`, `${'modules-' + version}.min/`].some(prefix => filename.startsWith(prefix))
        || !/^modules-[\w.-]+\/[\w-]+\.js(?:\.map)?$/.test(filename)) continue;
    const path = resolve(project, 'assets', filename);
    if (!outputs.has(path)) await unlink(path).catch(error => {if (error.code !== 'ENOENT') throw error;});
  }
}

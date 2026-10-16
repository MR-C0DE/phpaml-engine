import {readFile} from 'node:fs/promises';
import {resolve, relative} from 'node:path';
import {build} from 'esbuild';

// Explicit boundaries keep the existing PHP/browser implementations and tests as
// the single source of truth. Only the modular browser build substitutes imports.
const groups = {
  unicode: ['php-builtin-grapheme.js', 'php-builtin-mbstring.js'],
  intl: ['php-intl.js', 'php-intl-extra.js'],
  bcmath: ['php-builtin-bcmath.js'],
  regex: ['php-builtin-regex.js', 'php-regex-vm.js'],
  date: ['php-date-values.js', 'php-date-advanced.js', 'php-date-format-parser.js'],
  spl: ['php-spl.js', 'php-spl-list.js'],
  reflection: ['php-reflection.js'],
  files: ['../files-runtime.js', 'file-codecs.js'],
  browser: ['../browser-api.js', '../browser-forms.js', '../browser-storage.js', '../storage.js', '../http.js'],
  animations: ['../animations-runtime.js'],
};
const probes = new Set(['dateDefinition', 'intlDefinition', 'dateData', 'dateDebugEntries', 'advancedDateEntries', 'advancedDateProperty', 'cloneDate', 'cloneIntl', 'cloneSpl', 'cloneAdvancedDate', 'isDateObject', 'isSplObject', 'animateIn', 'restoreContexts', 'restorePersisted', 'restoreIndexed', 'scheduleRemoteValidation']);

export async function buildModules(project, version, minify) {
  const core = resolve(project, 'src-js/core');
  const members = new Map(Object.entries(groups).flatMap(([group, files]) => files.map(file => [resolve(core, file), group])));
  const exports = new Map();
  for (const file of members.keys()) {
    const source = await readFile(file, 'utf8');
    exports.set(file, [...source.matchAll(/export const (\w+)/g)].map(match => match[1]));
  }
  const folder = `assets/modules-${version}${minify ? '.min' : ''}`;
  const result = await build({
    absWorkingDir: project, entryPoints: ['phpaml-modular-entry'], bundle: true,
    format: 'esm', splitting: true, target: ['es2022'], minify, sourcemap: 'external',
    outdir: folder, entryNames: 'engine', chunkNames: '[name]-[hash]', write: false, metafile: true,
    plugins: [{name: 'phpaml-module-boundaries', setup(api) {
      api.onResolve({filter: /^phpaml-modular-entry$/}, () => ({path: 'engine', namespace: 'phpaml-entry'}));
      api.onResolve({filter: /^phpaml-module:/}, args => ({path: args.path.slice('phpaml-module:'.length), namespace: 'phpaml-module'}));
      api.onLoad({filter: /.*/, namespace: 'phpaml-entry'}, () => ({resolveDir: project, contents: `
        import {startEngine} from './src-js/start.js';
        import {configureModules,prepareScopeModules} from './src-js/modules/runtime.js';
        import {installDevelopmentErrorOverlay} from './src-js/development-errors.js';
        configureModules({${Object.keys(groups).map(name => `${JSON.stringify(name)}:()=>import(${JSON.stringify('phpaml-module:' + name)})`).join(',')}});
        if (!window.AMLEngine?.mount) {
          const scripts = [...document.querySelectorAll('script[data-aml-engine]')];
          const script = scripts.find(node=>node.src===import.meta.url) || scripts.at(-1);
          try {
            const loading=prepareScopeModules(document); if(loading) await loading;
            if (!window.AMLEngine?.mount) startEngine(script, new URL('../engine-eval-${version}.min.js',import.meta.url).href);
          } catch(error) {
            if (!window.AMLEngine?.mount) installDevelopmentErrorOverlay();
            document.dispatchEvent(new CustomEvent('aml:error',{detail:{error}}));console.error(error);
          }
        }
      `}));
      api.onLoad({filter: /.*/, namespace: 'phpaml-module'}, args => {
        if (!groups[args.path]) throw new Error(`Unknown module ${args.path}`);
        const files = groups[args.path].map(file => resolve(core, file));
        return {resolveDir: project, contents: `import {registerModule} from './src-js/modules/runtime.js';\n`
          + files.map((file, index) => `import * as part${index} from ${JSON.stringify('./' + relative(project, file))};`).join('\n')
          + `\nregisterModule(${JSON.stringify(args.path)},${JSON.stringify(version)},{${files.map((_,index)=>`...part${index}`).join(',')}});`};
      });
      api.onResolve({filter: /\.js$/}, args => {
        if (args.namespace === 'phpaml-proxy') return;
        const file = resolve(args.resolveDir, args.path), group = members.get(file);
        if (!group) return;
        const owner = args.namespace === 'phpaml-module' ? args.importer : members.get(args.importer);
        if (owner === group) return {path: file};
        return {path: relative(core, file), namespace: 'phpaml-proxy'};
      });
      api.onLoad({filter: /.*/, namespace: 'phpaml-proxy'}, args => ({resolveDir: core, contents:
        `import {moduleExport} from '../modules/runtime.js';\n` + exports.get(resolve(core, args.path)).map(name => {
          const lookup = `moduleExport(${JSON.stringify(members.get(resolve(core, args.path)))},${JSON.stringify(name)}`;
          if (name === 'dateStorage') return `export const dateStorage={get:key=>${lookup},true)?.get(key),has:key=>${lookup},true)?.has(key)||false};`;
          const optional = probes.has(name) || name.startsWith('run');
          return `export const ${name}=(...args)=>${lookup}${optional ? ',true)?.(...args)??null' : ')(...args)'};`;
        }).join('\n')
      }));
    }}],
  });
  // No optional implementation or its tables may leak into the initial graph.
  const initial = new Set();
  const walk = output => {if (initial.has(output)) return; initial.add(output); for (const item of result.metafile.outputs[output]?.imports || []) if (item.kind !== 'dynamic-import') walk(item.path);};
  const entry = Object.entries(result.metafile.outputs).find(([, value]) => value.entryPoint === 'phpaml-entry:engine')[0];
  walk(entry);
  for (const output of initial) for (const input of Object.keys(result.metafile.outputs[output]?.inputs || {})) {
    if (members.has(resolve(project, input))) throw new Error(`Optional implementation leaked into Core: ${input}`);
  }
  return {files: result.outputFiles, metadata: {entry, initial: [...initial], outputs: result.metafile.outputs}};
}

import {execFileSync, spawnSync} from 'node:child_process';
import {cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const project = resolve(fileURLToPath(new URL('..', import.meta.url)));
const view = resolve(process.env.PHPAML_VIEW_ROOT || resolve(project, '../phpaml-view'));
const scratch = mkdtempSync(resolve(tmpdir(), 'phpaml-distribution-'));
const artifacts = resolve(project, 'test-results/packages');
mkdirSync(artifacts, {recursive: true});
const run = (command, args, options = {}) => execFileSync(command, args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...options});
const archives = [];

// Snapshot tracked and non-ignored working files without touching either source
// index. git archive then applies the same export-ignore rules as release ZIPs.
function archive(source) {
  const metadata = JSON.parse(readFileSync(resolve(source, 'composer.json'), 'utf8'));
  const version = metadata.extra.phpaml.version;
  const name = metadata.name.replace('/', '-');
  const snapshot = resolve(scratch, name);
  mkdirSync(snapshot);
  const files = run('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {cwd: source}).split('\0').filter(Boolean);
  for (const relative of new Set(files)) {
    const from = resolve(source, relative);
    if (!from.startsWith(source + '/') || !existsSync(from)) continue;
    if (lstatSync(from).isSymbolicLink()) throw new Error(`Package snapshots cannot depend on source symlinks: ${relative}`);
    const target = resolve(snapshot, relative); mkdirSync(dirname(target), {recursive: true}); cpSync(from, target);
  }
  run('git', ['init', '--quiet', snapshot]);
  run('git', ['add', '--force', '--all'], {cwd: snapshot});
  const tree = run('git', ['write-tree'], {cwd: snapshot}).trim();
  const zip = resolve(artifacts, `${name}-${version}.zip`);
  run('git', ['archive', '--format=zip', `--prefix=${name}-${version}/`, `--output=${zip}`, tree], {cwd: snapshot});
  const {scripts, repositories, ...packageMetadata} = metadata;
  const sha1 = createHash('sha1').update(readFileSync(zip)).digest('hex');
  archives.push({name: metadata.name, version, zip, sha1, tree});
  return {...packageMetadata, version, dist: {type: 'zip', url: pathToFileURL(zip).href, shasum: sha1}};
}

try {
  const packages = [archive(project), archive(view)];
  writeFileSync(resolve(artifacts, 'archives.json'), JSON.stringify(archives, null, 2));
  const application = resolve(scratch, 'application'); mkdirSync(application);
  const composer = {
    name: 'phpaml/distribution-test', version: '1.0.0', require: {'phpaml/view': packages[1].version},
    'minimum-stability': 'beta', repositories: [{type: 'package', package: packages}, {'packagist.org': false}],
    config: {'allow-plugins': false, 'secure-http': true},
  };
  writeFileSync(resolve(application, 'composer.json'), JSON.stringify(composer, null, 2));
  console.log('Installing the release ZIPs with Composer; source repositories and Packagist are unavailable.');
  const install = spawnSync(process.env.COMPOSER_BINARY || 'composer', ['install', '--prefer-dist', '--no-dev', '--no-plugins', '--no-scripts', '--no-interaction', '--no-progress'], {
    encoding: 'utf8',
    cwd: application, env: {...process.env, COMPOSER: 'composer.json', COMPOSER_HOME: resolve(scratch, 'composer-home'), COMPOSER_CACHE_DIR: resolve(scratch, 'composer-cache'), COMPOSER_DISABLE_NETWORK: '1'},
  });
  writeFileSync(resolve(artifacts, 'composer.log'), (install.stdout || '') + (install.stderr || ''));
  if (install.error) throw install.error;
  if (install.status !== 0) throw new Error(`Composer installation failed. See ${resolve(artifacts, 'composer.log')}`);
  cpSync(resolve(application, 'composer.lock'), resolve(artifacts, 'composer.lock'));
  const installedEngine = resolve(application, 'vendor/phpaml/engine');
  const installedView = resolve(application, 'vendor/phpaml/view');
  const autoload = resolve(application, 'vendor/autoload.php');
  // Existing native fixtures use sibling repository names. These aliases point
  // exclusively to the installed ZIP contents, never to the development tree.
  symlinkSync('engine', resolve(application, 'vendor/phpaml/phpaml-engine'));
  symlinkSync('view', resolve(application, 'vendor/phpaml/phpaml-view'));
  const verify = () => run(process.env.PHP_BINARY || 'php', [resolve(project, 'tests/verify-installed.php'), application]);
  console.log(verify().trim());
  // Execute the Icon PHP regressions from the Composer-installed archive too.
  console.log(run(process.env.PHP_BINARY || 'php', ['-r', 'require $argv[1]; require $argv[2];', autoload, resolve(installedView, 'tests/icons.php')]).trim());
  // Prove that the package check actually rejects missing dynamic chunks.
  const manifest = JSON.parse(readFileSync(resolve(installedEngine, 'assets/public-assets.json'), 'utf8'));
  const chunk = manifest.find(file => /\.min\/unicode-.*\.js$/.test(file));
  if (!chunk) throw new Error('Unicode chunk missing from the distributed manifest.');
  const chunkPath = resolve(installedEngine, 'assets', chunk), content = readFileSync(chunkPath);
  rmSync(chunkPath);
  const missing = spawnSync(process.env.PHP_BINARY || 'php', [resolve(project, 'tests/verify-installed.php'), application], {encoding: 'utf8'});
  writeFileSync(chunkPath, content);
  if (missing.status === 0 || !missing.stderr.includes('Missing distributed asset')) throw new Error('Missing-chunk regression guard did not fail as expected.');
  verify();
  console.log('Missing-chunk regression guard passed.');
  if (process.argv.includes('--install-only')) process.exitCode = 0;
  else {
    const selected = process.env.PHPAML_BROWSER_RUNTIME;
    if (selected && !['full', 'modules'].includes(selected)) throw new Error('PHPAML_BROWSER_RUNTIME must be full or modules.');
    for (const runtime of selected ? [selected] : ['full', 'modules']) {
      console.log(`\nTesting installed packages with the ${runtime} runtime`);
      const result = spawnSync(process.execPath, ['node_modules/playwright/cli.js', 'test', '--config=playwright.packages.config.mjs', ...process.argv.slice(2)], {
        cwd: project, stdio: 'inherit', env: {...process.env, PHPAML_BROWSER_RUNTIME: runtime, PHPAML_ENGINE_ROOT: installedEngine, PHPAML_VIEW_ROOT: installedView, PHPAML_INSTALLED_AUTOLOAD: autoload},
      });
      if (result.error) throw result.error;
      if (result.status !== 0) {process.exitCode = result.status || 1; break;}
    }
  }
} finally {
  rmSync(scratch, {recursive: true, force: true});
}

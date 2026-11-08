import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const packageJson = require('../../package.json');
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

test('package identity is the agreed private ESM package', () => {
  assert.equal(packageJson.name, 'dsh-compat-spec');
  assert.equal(packageJson.version, '0.0.0');
  assert.equal(packageJson.type, 'module');
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.license, undefined);
  assert.equal(packageJson.engines.node, '>=24.9.0');
  assert.equal(packageJson.scripts.conformance, 'node tools/cli.mjs --conformance');
  assert.ok(existsSync(`${ROOT}tools/cli.mjs`));
  assert.equal(packageJson.main, './src/index.js');
  assert.equal(packageJson.exports['.'].default, './src/index.js');
});

test('the package declares no runtime or development dependencies', () => {
  assert.deepEqual(Object.keys(packageJson.dependencies ?? {}), []);
  assert.deepEqual(Object.keys(packageJson.devDependencies ?? {}), []);
  assert.deepEqual(Object.keys(packageJson.peerDependencies ?? {}), []);
  assert.deepEqual(Object.keys(packageJson.optionalDependencies ?? {}), []);
  assert.equal(typeof packageJson.engines?.node, 'string');
});

test('no install, lockfile or license artifacts are committed yet', () => {
  for (const absent of ['node_modules', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'LICENSE', 'LICENSE.md', 'COPYING']) {
    assert.equal(existsSync(`${ROOT}${absent}`), false, `${absent} must not exist in this revision`);
  }
});

test('the runtime module is self-contained and performs no I/O', () => {
  const source = readFileSync(`${ROOT}src/index.js`, 'utf8');
  assert.doesNotMatch(source, /^\s*import\s/m, 'src/index.js must have no imports');
  assert.doesNotMatch(source, /\brequire\s*\(/, 'src/index.js must not require');
  assert.doesNotMatch(source, /\bfetch\s*\(/, 'src/index.js must not fetch');
  assert.doesNotMatch(source, /process\.(env|cwd|argv)/, 'src/index.js must not read process state');
  assert.doesNotMatch(source, /node:/, 'src/index.js must not reference node builtins');
});

test('src/index.d.ts declares exactly the runtime value exports', async () => {
  const runtime = await import('../../src/index.js');
  const declared = new Set(
    [...readFileSync(`${ROOT}src/index.d.ts`, 'utf8').matchAll(/^export declare (?:const|function) (\w+)/gm)].map(
      (match) => match[1],
    ),
  );
  assert.deepEqual(
    [...declared].sort(),
    Object.keys(runtime).sort(),
    'src/index.d.ts drifted from the runtime module exports',
  );
});

test('the JSDoc on the public functions states the no-throw contract, scoped to JSON', () => {
  const source = readFileSync(`${ROOT}src/index.js`, 'utf8');
  const before = source.slice(0, source.indexOf('export function validateDeclaration'));
  assert.match(before, /No-throw contract: JSON values only/);
  // The old blanket promise must not come back.
  assert.doesNotMatch(before, /Never throws for any/);
  assert.match(before, /Proxy/);
  assert.equal((source.match(/@param \{unknown\} value/g) ?? []).length >= 1, true);
});

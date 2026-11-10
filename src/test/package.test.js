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
  assert.equal(packageJson.version, '0.1.0-draft.1');
  assert.equal(packageJson.type, 'module');
  assert.equal(packageJson.private, true);
  // Decided 2026-11-10: the four repositories carry MIT. Until then this asserted
  // `undefined`, which encoded "no license chosen yet" rather than a property of the
  // package; the decision is what changed, not the package.
  assert.equal(packageJson.license, 'MIT');
  assert.equal(packageJson.repository.url, 'git+https://github.com/lbn2011/dsh-compat-spec.git');
  assert.equal(packageJson.engines.node, '>=24.9.0');
  assert.equal(packageJson.scripts.conformance, 'node tools/cli.mjs --conformance');
  assert.ok(existsSync(`${ROOT}tools/cli.mjs`));
  assert.equal(packageJson.main, './src/index.js');
  assert.equal(packageJson.exports['.'].default, './src/index.js');
});

test('the admission-evidence grammar is reachable by package specifier', async () => {
  const entry = packageJson.exports['./admission-evidence'];
  assert.equal(entry.default, './src/admission-evidence.js');
  assert.equal(entry.types, './src/admission-evidence.d.ts');
  assert.ok(existsSync(`${ROOT}${entry.default.slice(2)}`), 'the default target must exist');
  assert.ok(existsSync(`${ROOT}${entry.types.slice(2)}`), 'the types target must exist');

  // Self-reference: the specifier must resolve from inside this package without
  // any sibling path, because that is the route a consumer is expected to take.
  const namespace = await import('dsh-compat-spec/admission-evidence');
  assert.equal(typeof namespace.validateAdmissionEvidence, 'function');
  assert.equal(namespace.VERSION, 'admission-evidence/0.1-draft.1');
});

test('the package declares no runtime or development dependencies', () => {
  assert.deepEqual(Object.keys(packageJson.dependencies ?? {}), []);
  assert.deepEqual(Object.keys(packageJson.devDependencies ?? {}), []);
  assert.deepEqual(Object.keys(packageJson.peerDependencies ?? {}), []);
  assert.deepEqual(Object.keys(packageJson.optionalDependencies ?? {}), []);
  assert.equal(typeof packageJson.engines?.node, 'string');
});

test('no install or lockfile artifacts are committed, and the license is the decided one', () => {
  for (const absent of ['node_modules', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock']) {
    assert.equal(existsSync(`${ROOT}${absent}`), false, `${absent} must not exist in this revision`);
  }
  // Decided 2026-11-10: MIT, and the file must be the MIT text rather than an empty
  // placeholder. A LICENSE that exists but says nothing would satisfy the manifest
  // field while telling a consumer nothing.
  assert.equal(existsSync(`${ROOT}LICENSE`), true, 'LICENSE must exist once a license is decided');
  const text = readFileSync(`${ROOT}LICENSE`, 'utf8');
  assert.match(text, /^MIT License\n/, 'LICENSE must be the MIT text');
  assert.match(text, /Copyright \(c\) 2026 lbn2011/);
  assert.doesNotMatch(text, /\bTODO\b|\bplaceholder\b/i);
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

test('configuration revision APIs and types are exposed without changing legacy defaults', async () => {
  const runtime = await import('dsh-compat-spec');
  assert.equal(runtime.CONFIG_SCHEMA_PROTOCOL_VERSION, '0.2.0-draft.1');
  assert.deepEqual(runtime.SUPPORTED_PROTOCOL_VERSIONS, ['0.1.0-draft.1', '0.2.0-draft.1']);
  assert.equal(typeof runtime.declarationJsonSchemaForVersion, 'function');
  assert.equal(runtime.declarationJsonSchema().properties.schemaVersion.const, runtime.PROTOCOL_VERSION);
  const types = readFileSync(`${ROOT}src/index.d.ts`, 'utf8');
  assert.match(types, /export interface PluginDeclaration\s*\{\s*schemaVersion: typeof PROTOCOL_VERSION;/);
  assert.match(types, /export interface ConfigPluginDeclaration extends Omit<PluginDeclaration, 'schemaVersion'>\s*\{\s*schemaVersion: typeof CONFIG_SCHEMA_PROTOCOL_VERSION;\s*configSchema: ConfigurationSchema;/);
  assert.match(types, /export type SupportedPluginDeclaration = PluginDeclaration \| ConfigPluginDeclaration;/);
  assert.match(types, /export type ConfigurationSchema = boolean \|/);
  assert.match(types, /declarationJsonSchemaForVersion\(version: SupportedProtocolVersion\)/);
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

/**
 * Keep spec/declaration.schema.json byte-identical to declarationJsonSchema()
 * in src/index.js. Generated artifacts that drift are a correctness bug: the
 * schema is consumed by third parties who never run this package.
 *
 *   node tools/schema-sync.mjs --check   exit 1 when the committed file drifts
 *   node tools/schema-sync.mjs --write   rewrite the committed file
 *
 * This module is also imported by src/test/schema.test.js, so it must not run
 * the CLI when imported. Entry-point detection tolerates its absence.
 */
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { declarationJsonSchema } from '../src/index.js';

export const SCHEMA_PATH = fileURLToPath(new URL('../spec/declaration.schema.json', import.meta.url));

/** Canonical serialization of the generated schema, including the trailing newline. */
export function renderSchema() {
  return `${JSON.stringify(declarationJsonSchema(), null, 2)}\n`;
}

function samePath(left, right) {
  if (!left || !right) return false;
  try {
    return realpathSync(left) === realpathSync(right);
  } catch {
    return false;
  }
}

function main(argv) {
  const mode = argv[2];
  if (mode === '--write') {
    writeFileSync(SCHEMA_PATH, renderSchema(), 'utf8');
    process.stdout.write(`wrote ${SCHEMA_PATH}\n`);
    return 0;
  }
  if (mode === '--check') {
    let committed;
    try {
      committed = readFileSync(SCHEMA_PATH, 'utf8');
    } catch {
      process.stderr.write(`missing ${SCHEMA_PATH}; run: node tools/schema-sync.mjs --write\n`);
      return 1;
    }
    if (committed !== renderSchema()) {
      process.stderr.write(
        `drift: ${SCHEMA_PATH} does not match declarationJsonSchema(); run: node tools/schema-sync.mjs --write\n`,
      );
      return 1;
    }
    process.stdout.write('schema in sync\n');
    return 0;
  }
  process.stderr.write('usage: node tools/schema-sync.mjs --check|--write\n');
  return 2;
}

if (samePath(process.argv[1], fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv);
}

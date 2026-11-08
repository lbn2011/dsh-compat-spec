#!/usr/bin/env node
/**
 * Minimal command-line surface for humans and CI. Optional: the protocol is
 * usable purely as a library. Reads a JSON file only when explicitly given one,
 * never writes anything, always exits 0 for `--schema`.
 *
 *   node tools/cli.mjs --check <declaration.json>
 *   node tools/cli.mjs --conformance
 *   node tools/cli.mjs --schema
 *   node tools/cli.mjs --template
 */
import { readFileSync } from 'node:fs';

import { diffResult, loadVectors, unimplementedReason } from '../conformance/index.mjs';
import { declarationJsonSchema, declarationTemplate, validateDeclaration } from '../src/index.js';

const [flag, argument] = process.argv.slice(2);

function usage() {
  process.stderr.write(
    'usage: node tools/cli.mjs --check <declaration.json> | --conformance | --schema | --template\n',
  );
}

function check(file) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    process.stderr.write(`cannot read declaration JSON: ${error.message}\n`);
    return 2;
  }
  const result = validateDeclaration(parsed);
  if (result.valid) {
    process.stdout.write(`${file}: valid\n`);
    return 0;
  }
  process.stdout.write(`${file}: invalid (${result.issues.length} issue(s))\n`);
  for (const entry of result.issues) {
    process.stdout.write(`  ${entry.path || '<root>'}: ${entry.code}: ${entry.message}\n`);
  }
  return 1;
}

function conformance() {
  let failures = 0;
  let unimplemented = 0;
  let evaluated = 0;
  for (const vector of loadVectors()) {
    const reason = unimplementedReason(vector);
    if (reason !== null) {
      // Counted as unimplemented, never as a pass: the expectation stays on record.
      unimplemented += 1;
      process.stdout.write(`unimplemented  ${vector.id} (${reason})\n`);
      continue;
    }
    evaluated += 1;
    const differences = diffResult(validateDeclaration(vector.declaration), vector.expected);
    if (differences.length === 0) {
      process.stdout.write(`pass  ${vector.id}\n`);
    } else {
      failures += 1;
      process.stdout.write(`FAIL  ${vector.id}\n`);
      for (const difference of differences) process.stdout.write(`        ${difference}\n`);
    }
  }
  const verdict = failures === 0 ? 'conformant' : 'NOT conformant';
  process.stdout.write(
    `\n${verdict} on implemented vectors: ${evaluated} evaluated, ${failures} failure(s); ${unimplemented} vector(s) unimplemented and NOT counted as passed\n`,
  );
  return failures === 0 ? 0 : 1;
}

switch (flag) {
  case '--check':
    if (!argument) {
      usage();
      process.exitCode = 2;
    } else {
      process.exitCode = check(argument);
    }
    break;
  case '--conformance':
    process.exitCode = conformance();
    break;
  case '--schema':
    process.stdout.write(`${JSON.stringify(declarationJsonSchema(), null, 2)}\n`);
    break;
  case '--template':
    process.stdout.write(`${JSON.stringify(declarationTemplate(), null, 2)}\n`);
    break;
  default:
    usage();
    process.exitCode = 2;
}

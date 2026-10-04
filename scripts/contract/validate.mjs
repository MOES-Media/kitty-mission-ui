// Validation of fixtures against the dereferenced pinned schemas (Ajv 2020, closed shapes).
import $RefParser from '@apidevtools/json-schema-ref-parser';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { join } from 'node:path';
import { LAYOUT, vendoredDigest } from './common.mjs';

// Cache keyed by the digest of the vendored bytes: a case that mutates a schema file gets a fresh entry.
const schemaCache = new Map();

/** The dereferenced schema `name` of the vendored contract. Pristine: callers clone before patching. */
export async function loadSchema(root, name) {
  const key = `${vendoredDigest(root)}:${name}`;
  if (!schemaCache.has(key)) {
    const file = join(root, LAYOUT.schemas, `${name}.yaml`);
    schemaCache.set(key, $RefParser.dereference(file, { dereference: { circular: 'ignore' } }));
  }
  return schemaCache.get(key);
}

/** A relaxed copy of a pristine schema; the pristine copy is untouched. */
export function relaxedSchema(pristine, relaxation) {
  const copy = structuredClone(pristine);
  relaxation.patch(copy);
  return copy;
}

export function compile(schema) {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

/** Run a compiled validator; errors are reduced to path, keyword and message. */
export function validateWith(validate, doc) {
  const valid = validate(doc) === true;
  const errors = (validate.errors ?? []).map((e) => ({ path: e.instancePath, keyword: e.keyword, message: e.message ?? '' }));
  return { valid, errors };
}

/** A copy of `doc` without the host-only fields (`stale` on a Mission overview or a page, `actor` on a work package). */
export function stripHost(doc) {
  const copy = structuredClone(doc);
  const strip = (m) => {
    if (m && typeof m === 'object') delete m.stale;
  };
  strip(copy);
  for (const item of copy.items ?? []) strip(item);
  for (const wp of copy.workPackages ?? []) {
    if (wp && typeof wp === 'object') delete wp.actor;
  }
  return copy;
}

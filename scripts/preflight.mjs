// Credential preflight for @spec-kitty/* (FR-013). Zero dependencies: it runs before `pnpm install`.
//
// Usage:
//   node scripts/preflight.mjs         local: offline check of the user npmrc, then the online check
//   node scripts/preflight.mjs --ci    CI: the token comes from env NPM_TOKEN, then the online check
//
// Exit codes:
//   0   credential present and accepted by the registry
//   9   credential missing (local: no _authToken line in the user npmrc; --ci: NPM_TOKEN empty).
//       The only message that carries the marker PLANT-PREFLIGHT-MISSING.
//   10  token rejected or expired (HTTP 401)
//   11  token cannot read @spec-kitty/elements (HTTP 403/404): needs read:packages and org access
//   12  registry unreachable or unexpected response
// The token is never printed.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const core = require('./preflight-core.cjs');

const URL_ELEMENTS = 'https://npm.pkg.github.com/@spec-kitty%2felements';
const MARKER = 'PLANT-PREFLIGHT-MISSING';
const AUTH_LINE = /^\s*\/\/npm\.pkg\.github\.com\/:_authToken=(\S+)\s*$/m;

function fail(code, message) {
  process.stderr.write(`PREFLIGHT: ${message}\n`);
  process.exit(code);
}

function tokenFromUserNpmrc(env) {
  try {
    const m = AUTH_LINE.exec(readFileSync(core.userNpmrcPath(env), 'utf8'));
    return m?.[1] ?? '';
  } catch {
    return '';
  }
}

function resolveToken(ci, env) {
  if (ci) {
    const token = (env.NPM_TOKEN ?? '').trim();
    if (token === '') {
      fail(9, `${MARKER} The repository secret NPM_TOKEN is empty or not set. Add it under the repository's ` +
        'Actions secrets (a token with read:packages and access to the spec-kitty org).');
    }
    return token;
  }
  if (!core.hasCredential(env)) {
    process.stderr.write(`${core.failureMessage(env)} ${MARKER}\n`);
    process.exit(9);
  }
  return tokenFromUserNpmrc(env);
}

async function onlineCheck(token) {
  let status;
  try {
    const res = await fetch(URL_ELEMENTS, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
    status = res.status;
  } catch (err) {
    fail(12, `could not reach npm.pkg.github.com (${err?.name ?? 'error'}); check the network and retry`);
  }
  if (status === 401) fail(10, 'token rejected or expired');
  if (status === 403 || status === 404) {
    fail(11, 'token cannot read @spec-kitty/elements: needs read:packages and org access (SSO authorised)');
  }
  if (status < 200 || status >= 300) fail(12, `unexpected registry response: HTTP ${status}`);
}

const ci = process.argv.includes('--ci');
const token = resolveToken(ci, process.env);
await onlineCheck(token);
process.stdout.write('PREFLIGHT: credential for @spec-kitty/* accepted by the registry\n');

'use strict';
// Offline credential check shared by .pnpmfile.cjs and scripts/preflight.mjs.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const AUTH_LINE = /^\s*\/\/npm\.pkg\.github\.com\/:_authToken=(\S+)\s*$/m;

const MESSAGE =
  'Missing GitHub Packages credential for @spec-kitty/*. Add //npm.pkg.github.com/:_authToken=<token> ' +
  'to ~/.npmrc (token needs read:packages and access to the spec-kitty org; ' +
  'pnpm does not read NODE_AUTH_TOKEN for this).';

const ENV_MESSAGE =
  ' NODE_AUTH_TOKEN/NPM_TOKEN is set in the environment, but pnpm ignores it: ' +
  'the //npm.pkg.github.com/:_authToken line is absent from the user npmrc file.';

/** True only when pnpm runs with BOTH --offline and --frozen-lockfile. */
function shouldSkip(argv) {
  const args = Array.isArray(argv) ? argv : [];
  return args.includes('--offline') && args.includes('--frozen-lockfile');
}

const FETCH_COMMANDS = new Set([
  'install', 'i', 'add', 'update', 'up', 'upgrade', 'fetch', 'dedupe', 'import',
  'install-test', 'it', 'remove', 'rm', 'uninstall', 'un', 'link', 'ln', 'prune',
  'rebuild', 'rb', 'approve-builds',
]);
// Commands that never resolve or fetch dependencies. Together with FETCH_COMMANDS this is the set of words
// that count as "the pnpm command"; any other positional is the value of a value-taking global flag
// (--store-dir X, --registry X, ...) or a script name, and is skipped.
const OTHER_COMMANDS = new Set([
  'run', 'exec', 'dlx', 'x', 'test', 't', 'start', 'stop', 'restart', 'ls', 'list', 'll', 'la', 'why', 'outdated',
  'audit', 'publish', 'pack', 'root', 'bin', 'store', 'config', 'c', 'get', 'set', 'env', 'create', 'init',
  'licenses', 'patch', 'patch-commit', 'patch-remove', 'deploy', 'setup', 'self-update', 'doctor', 'cat-file',
  'cat-index', 'find-hash', 'server', 'login', 'logout', 'whoami', 'view', 'info', 'show', 'dist-tag', 'unpublish',
  'deprecate', 'team', 'access', 'owner', 'token', 'sbom', 'catalog', 'help', 'completion', 'fetch-store',
]);
const VALUE_FLAGS = new Set(['-C', '--dir', '--filter', '-F', '--filter-prod', '--config', '--loglevel', '--reporter']);

/**
 * The pnpm command word in argv: the first positional after the script path that is a known pnpm command.
 * Unknown positionals (values of global flags not listed in VALUE_FLAGS, script names) are skipped, so
 * `pnpm --store-dir X install` still resolves to `install`.
 */
function commandOf(argv) {
  const args = Array.isArray(argv) ? argv.slice(2) : [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === undefined) continue;
    if (VALUE_FLAGS.has(a)) { i += 1; continue; }
    if (a.startsWith('-')) continue;
    if (FETCH_COMMANDS.has(a) || OTHER_COMMANDS.has(a)) return a;
  }
  return undefined;
}

/** True only for commands that resolve or fetch dependencies (run/exec/ls/... never need the credential). */
function isFetchCommand(argv) {
  const c = commandOf(argv);
  return c !== undefined && FETCH_COMMANDS.has(c);
}

function userNpmrcPath(env = process.env) {
  return env.NPM_CONFIG_USERCONFIG || path.join(env.HOME || os.homedir(), '.npmrc');
}

function hasCredential(env = process.env) {
  let text;
  try {
    text = fs.readFileSync(userNpmrcPath(env), 'utf8');
  } catch {
    return false;
  }
  const m = AUTH_LINE.exec(text);
  return m !== null && m[1] !== undefined && m[1].length > 0;
}

function failureMessage(env = process.env) {
  const envSet = Boolean(env.NODE_AUTH_TOKEN || env.NPM_TOKEN);
  return 'PREFLIGHT: ' + MESSAGE + (envSet ? ENV_MESSAGE : '');
}

/** Run the check; exits 9 with the named message when the credential is missing. */
function check(argv = process.argv, env = process.env) {
  if (!isFetchCommand(argv)) return true;
  if (shouldSkip(argv)) return true;
  if (hasCredential(env)) return true;
  process.stderr.write(failureMessage(env) + '\n');
  process.exit(9);
}

module.exports = { shouldSkip, isFetchCommand, commandOf, FETCH_COMMANDS, hasCredential, failureMessage, userNpmrcPath, check, MESSAGE };

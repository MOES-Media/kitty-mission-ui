// Pure hygiene rules. No I/O here: callers pass content in and get findings out.
// Pattern sources are assembled from fragments so this file never matches its own rules.

const HOME = '/' + 'home' + '/';
const USERS = '/' + 'Users' + '/';
const AUTH = '_auth' + 'Token';

const PLACEHOLDER_NAMES = new Set(['<user>', '<name>', '<repo>']);
const CI_ROOTS = [
  new RegExp(HOME + 'runner(?![^/\\s"\'`\\\\])', 'g'),
  /\/github\/workspace(?![^/\s"'`\\])/g,
  /\/__w\//g,
  /\/github\/home(?![^/\s"'`\\])/g,
];

/**
 * Nothing is exempt. The spec-kitty CLI writes absolute paths (`source_path` in the charter, `feedback_path` and
 * `record_path` in a mission's `status.json` and `status.events.jsonl`); in a public repository they are scrubbed
 * before commit like any other path, so the path rules apply to every tracked file, CLI state files included.
 * The list and its consumers stay so `--list-allowed` keeps working and prints nothing.
 */
export const ALLOW_LIST = Object.freeze([]);

// Private-workspace markers. Assembled from fragments so this file never matches its own rules.
// An agent scratchpad path embeds the OS user id; a three-or-more-digit `SK-` id is a private tooling-ledger reference
// (two-digit `SK-NN` codes are prototype finding codes and pass).
const SCRATCHPAD = new RegExp('/' + 'tmp/' + 'claude-' + '\\d+', 'g');
const LEDGER_ID = new RegExp('\\b' + 'S' + 'K-' + '\\d{3,}\\b', 'g');

// Shared CI and service accounts: their names are ordinary words in workflow text and are not personal.
const GENERIC_ACCOUNTS = new Set([
  'admin', 'build', 'circleci', 'codespace', 'docker', 'github', 'jenkins', 'node', 'root', 'runner', 'ubuntu', 'user',
  'vscode',
]);

/**
 * The names the username rule looks for: the OS username of the account running the gate and any names in `extra`
 * (comma or whitespace separated, for example from a CI secret). Names under 4 characters and shared accounts are
 * skipped. Lower-cased and de-duplicated.
 */
export function forbiddenNames(username, extra = '') {
  const all = [username ?? '', ...String(extra ?? '').split(/[\s,]+/)].map((n) => n.trim().toLowerCase());
  return [...new Set(all.filter((n) => n.length >= 4 && !GENERIC_ACCOUNTS.has(n)))];
}

function nameRegex(name) {
  return new RegExp(`(?<![A-Za-z0-9])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9])`, 'i');
}

// E-mail rule (NFR-007, research D-13). Path scoped: the vendored contract, the contract directory of a package, and
// authored fixtures and stories. Elsewhere an address is legitimate (the CLI's own event log carries a noreply actor).
const EMAIL_SCOPE = [
  /^contracts\//,
  /^packages\/[^/]+\/src\/contract\//,
  /^packages\/[^/]+\/src\/(?:.*\/)?fixtures\.ts$/,
  /^packages\/[^/]+\/src\/(?:.*\/)?[^/]+\.fixtures\.ts$/,
  /^packages\/[^/]+\/src\/(?:.*\/)?[^/]+\.stories\.ts$/,
];
const EMAIL_ALLOWED = ['example.com', 'example.org', 'example.net'];
// local part, an at sign, a dotted domain ending in letters: `lit@3.3.3` and `name@sha256:...` do not match.
const EMAIL = new RegExp('[A-Za-z0-9._%+-]+' + '@' + '([A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,})', 'g');

function emailAllowed(domain) {
  const d = domain.toLowerCase();
  return d.endsWith('.invalid') || EMAIL_ALLOWED.some((a) => d === a || d.endsWith('.' + a));
}

// CLI-written identity (kitty-specs). The username rule above only knows the account running the gate; these rules do
// not depend on it. In a mission's `meta.json` and `status.events.jsonl` an actor-like field (`accepted_by`, `actor`,
// `actor_id`, `agent`, `author`, any `*_by`) may hold only a neutral value: the `<user>` placeholder, `claude` (or `claude:<model>`), `user`,
// the CLI's own actors (`cli`, `merge`, `finalize-tasks`, a `spec-kitty ...` command line, empty) or a noreply address.
const KITTY_RECORD = /^kitty-specs\/[^/]+\/(?:meta\.json|status\.events\.jsonl)$/;
const KITTY_FILE = /^kitty-specs\//;
const ACTOR_KEY = /^(?:actor|actor_id|accepted_by|agent|author|[a-z][a-z_]*_by)$/;
const NEUTRAL_ACTORS = new Set(['<user>', 'claude', 'user', 'cli', 'merge', 'finalize-tasks', '']);
const PATH_KEY = /^(?:record_path|feedback_path)$/;
const JSON_STRING_FIELD = /"([A-Za-z_]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
const EMAIL_WITH_LOCAL = new RegExp('([A-Za-z0-9._%+-]+)' + '@' + '([A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,})', 'g');

function neutralActor(value) {
  return NEUTRAL_ACTORS.has(value) || /^claude:[a-z0-9.-]+$/.test(value) || /^spec-kitty(?: [a-z][a-z-]*)+$/.test(value) || noreplyAddress(value);
}

function noreplyAddress(value) {
  const m = /^([^@\s]+)@([^@\s]+)$/.exec(value);
  return m !== null && (/^no-?reply$/i.test(m[1]) || /(?:^|\.)noreply\./i.test(m[2]));
}

function absolutePath(value) {
  const v = value.replace(/\\\//g, '/');
  return v.startsWith('/') || /^[A-Za-z]:[\\/]/.test(v) || v.startsWith('\\\\');
}

function kittyLineFindings(file, n, lineText) {
  const out = [];
  if (KITTY_RECORD.test(file)) {
    for (const m of lineText.matchAll(JSON_STRING_FIELD)) {
      if (ACTOR_KEY.test(m[1]) && !neutralActor(m[2])) {
        out.push(finding('cli-identity', file, n, `${m[1]} holds a name that is not <user> or a neutral actor (value withheld)`));
      }
      if (PATH_KEY.test(m[1]) && absolutePath(m[2])) {
        out.push(finding('cli-absolute-path', file, n, `${m[1]} is an absolute path (value withheld)`));
      }
    }
  }
  if (KITTY_FILE.test(file)) {
    for (const m of lineText.matchAll(EMAIL_WITH_LOCAL)) {
      if (!noreplyAddress(`${m[1]}@${m[2]}`) && !emailAllowed(m[2])) {
        out.push(finding('email-address', file, n, 'e-mail address that is not a noreply address (value withheld)'));
      }
    }
  }
  return out;
}

const finding = (rule, file, line, message) => ({ rule, file, line, message });

function isPlaceholderName(seg) {
  return PLACEHOLDER_NAMES.has(seg) || /^\$\{[^}]*\}$/.test(seg);
}

function isAllowed(file, lineText) {
  return ALLOW_LIST.some((entry) => entry.file === file && entry.linePattern?.test(lineText));
}

/** Remove the allow-listed key/value text of strip-style entries before the path scan. */
function stripAllowed(file, lineText) {
  return ALLOW_LIST.reduce(
    (text, entry) => (entry.filePattern?.test(file) ? text.replace(entry.stripPattern, '') : text),
    lineText,
  );
}

const TOKEN_SHAPES = [
  /gh[pousr]_[A-Za-z0-9]{36}/,
  /github_pat_\w{22,}/,
  /npm_[A-Za-z0-9]{36}/,
];

const AUTH_ASSIGN = new RegExp(AUTH + '["\']?\\s*[=:]\\s*([^\\s]*)', 'g');
const AUTH_ANY = new RegExp(AUTH);
// A quoted key ending in auth-token (any prefix, optional underscore) followed by its value.
const QUOTED_KEY = new RegExp('"[^"\\n]*auth' + 'Token"(\\s*[:=]?\\s*)("[^"]*"|[^\\s,}]+)', 'ig');
const BEARER = new RegExp('Authorization:\\s*Bearer\\s+(\\S+)', 'i');

function stripQuotes(v) {
  return v.replace(/^["'`]+|["'`,;]+$/g, '');
}

function isPlaceholderValue(raw) {
  const v = stripQuotes(raw);
  if (v === '' || /^<[^<>\s]+>/.test(v)) return true;
  if (v.includes('%s')) return true;
  // regex capture-group fragments in source code, e.g. (\S+), are patterns, not credentials
  return /^\(\\S[+*]\)/.test(v);
}

function pathFindings(file, lineNo, lineText, strictCi = false) {
  let text = stripAllowed(file, lineText).replace(/\\\//g, '/');
  const out = [];
  if (strictCi) {
    // Published output (a built site, a record) must never carry a runner path: flag instead of strip.
    for (const root of CI_ROOTS) {
      if ([...text.matchAll(root)].length > 0) out.push(finding('ci-path', file, lineNo, 'CI runner path in published output'));
    }
  } else {
    for (const root of CI_ROOTS) text = text.replace(root, '');
  }
  const unix = [
    [HOME, new RegExp(HOME + '([^/\\s"\'`\\\\]+)', 'g')],
    [USERS, new RegExp(USERS + '([^/\\s"\'`\\\\]+)', 'g')],
  ];
  for (const [, re] of unix) {
    for (const m of text.matchAll(re)) {
      if (!isPlaceholderName(m[1])) out.push(finding('user-path', file, lineNo, 'absolute user path'));
    }
  }
  const win = /[A-Za-z]:\\{1,2}Users\\{1,2}([^\\/\s"'`]+)/g;
  for (const m of text.matchAll(win)) {
    if (!isPlaceholderName(m[1])) out.push(finding('user-path', file, lineNo, 'absolute user path'));
  }
  return out;
}

/**
 * Token, credential-assignment, path, scratchpad, ledger-id and username rules over one file's text. `options.strictCi`
 * (scan-dir / built-output mode) flags CI runner roots instead of stripping them; the repository scan strips them because
 * workflow text names them. `options.names` (from `forbiddenNames`) are matched case-insensitively as whole words.
 */
export function scanText(file, text, options = {}) {
  const out = [];
  const isNpmrc = file === '.npmrc' || file.endsWith('/.npmrc');
  const nameMatchers = (options.names ?? []).map(nameRegex);
  const lines = text.split(/\r?\n/);
  lines.forEach((lineText, i) => {
    const n = i + 1;
    if (TOKEN_SHAPES.some((re) => re.test(lineText))) {
      out.push(finding('plant-hygiene-token', file, n, 'token-shaped string with a body (value withheld)'));
    }
    let assigned = false;
    for (const m of lineText.matchAll(AUTH_ASSIGN)) {
      if (!isPlaceholderValue(m[1])) {
        assigned = true;
        out.push(finding('auth-token-assignment', file, n, 'auth token assignment with a non-placeholder value'));
      }
    }
    if (isNpmrc && AUTH_ANY.test(lineText)) {
      out.push(finding('npmrc-auth', file, n, 'auth token line in an .npmrc file'));
    }
    if (!assigned) {
      for (const m of lineText.matchAll(QUOTED_KEY)) {
        // With no `:`/`=` separator (.yarnrc v1 form) only a quoted value counts; bare prose after a
        // quoted key name (e.g. reviewer text quoting the key) is not a credential.
        const hasSeparator = /[:=]/.test(m[1]);
        if (!hasSeparator && !m[2].startsWith('"')) continue;
        if (!isPlaceholderValue(m[2])) {
          out.push(finding('auth-token-key', file, n, 'quoted auth token key with a non-placeholder value'));
        }
      }
    }
    const b = BEARER.exec(lineText);
    if (b && !/^<[^<>\s]+>/.test(stripQuotes(b[1]))) {
      out.push(finding('bearer-literal', file, n, 'Authorization Bearer with a literal value'));
    }
    if (EMAIL_SCOPE.some((re) => re.test(file))) {
      for (const m of lineText.matchAll(EMAIL)) {
        if (!emailAllowed(m[1])) out.push(finding('email-address', file, n, 'e-mail address (value withheld)'));
      }
    }
    out.push(...kittyLineFindings(file, n, lineText));
    if (!options.skipPaths) {
      for (const f of pathFindings(file, n, lineText, options.strictCi === true)) {
        if (!isAllowed(file, lineText)) out.push(f);
      }
      if ([...lineText.matchAll(SCRATCHPAD)].length > 0) {
        out.push(finding('scratchpad-path', file, n, 'agent scratchpad path (embeds the OS user id)'));
      }
    }
    if ([...lineText.matchAll(LEDGER_ID)].length > 0) {
      out.push(finding('ledger-id', file, n, 'private tooling-ledger id (value withheld)'));
    }
    for (const re of nameMatchers) {
      if (re.test(lineText)) out.push(finding('os-username', file, n, 'username of a forbidden account (value withheld)'));
    }
  });
  return out;
}

/** .npmrc must be byte-equal to the single scope line. */
export function checkNpmrc(content) {
  const expected = '@spec-kitty:registry=https://npm.pkg.github.com\n';
  return content === expected
    ? []
    : [finding('npmrc-bytes', '.npmrc', 0, 'committed .npmrc is not byte-equal to the single scope line')];
}

const EXACT = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const DEP_SECTIONS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

function specOk(spec) {
  return typeof spec === 'string' && (EXACT.test(spec) || spec === 'workspace:*');
}

/** Exact-version-only specs, including engines and pnpm overrides. */
export function checkPackageJson(file, json) {
  const out = [];
  for (const section of DEP_SECTIONS) {
    for (const [dep, spec] of Object.entries(json[section] ?? {})) {
      if (!specOk(spec)) out.push(finding('version-pin', file, 0, `${section}.${dep} is not an exact version`));
    }
  }
  for (const [dep, spec] of Object.entries(json.pnpm?.overrides ?? {})) {
    if (!specOk(spec)) out.push(finding('version-pin', file, 0, `pnpm.overrides.${dep} is not an exact version`));
  }
  if (json.packageManager !== undefined) {
    // Corepack form with the tarball hash: `pnpm@<exact>+sha512.<128 hex>`, same version as engines.pnpm.
    const m = /^pnpm@(\d+\.\d+\.\d+)\+sha512\.[0-9a-f]{128}$/.exec(String(json.packageManager));
    if (!m) out.push(finding('version-pin', file, 0, 'packageManager must be pnpm@<exact>+sha512.<hex>'));
    else if (json.engines?.pnpm !== undefined && json.engines.pnpm !== m[1]) {
      out.push(finding('version-pin', file, 0, 'packageManager version differs from engines.pnpm'));
    }
  }
  for (const [eng, spec] of Object.entries(json.engines ?? {})) {
    if (!EXACT.test(String(spec))) out.push(finding('version-pin', file, 0, `engines.${eng} is not an exact version`));
  }
  return out;
}

/** vitest and @vitest/* must all carry one version across every package.json. */
export function checkVitestFamily(manifests) {
  const seen = new Map();
  for (const { file, json } of manifests) {
    for (const section of DEP_SECTIONS) {
      for (const [dep, spec] of Object.entries(json[section] ?? {})) {
        if (dep === 'vitest' || dep.startsWith('@vitest/')) seen.set(`${file}:${dep}`, spec);
      }
    }
  }
  const versions = new Set(seen.values());
  return versions.size > 1
    ? [finding('vitest-family', 'package.json', 0, `vitest family versions differ: ${[...versions].join(', ')}`)]
    : [];
}

/** @playwright/test version must equal every Playwright image tag found in the given files. */
export function checkPlaywrightTag(version, sources) {
  const out = [];
  for (const { file, text } of sources) {
    for (const m of text.matchAll(/playwright:v(\d+\.\d+\.\d+)/g)) {
      if (m[1] !== version) {
        out.push(finding('playwright-tag', file, 0, `image tag ${m[1]} differs from @playwright/test ${version}`));
      }
    }
  }
  return out;
}

const TARBALL_PREFIX = 'https://npm.pkg.github.com/download/@spec-kitty/';

/**
 * Every @spec-kitty/* package entry in the lockfile carries an integrity hash AND a tarball URL on the private
 * registry (a lockfile resolving the scope elsewhere would fetch the package from an unexpected host).
 */
export function checkLockfile(text) {
  if (text === null) return [finding('lockfile', 'pnpm-lock.yaml', 0, 'pnpm-lock.yaml is missing')];
  const out = [];
  const lines = text.split('\n');
  const entry = /^ {2}'?(@spec-kitty\/[^@']+@[^':]+)'?:\s*$/;
  let inPackages = false;
  let count = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^\S/.test(lines[i])) inPackages = lines[i].startsWith('packages:');
    const m = inPackages ? entry.exec(lines[i]) : null;
    if (!m) continue;
    count += 1;
    const body = [];
    for (let j = i + 1; j < lines.length && /^ {3,}/.test(lines[j]); j += 1) body.push(lines[j]);
    if (!body.some((l) => l.includes('integrity:'))) {
      out.push(finding('lockfile', 'pnpm-lock.yaml', i + 1, `${m[1]} has no integrity`));
    }
    const tarball = /tarball:\s*([^,}\s]+)/.exec(body.join('\n'));
    if (!tarball || !tarball[1].replace(/^['"]|['"]$/g, '').startsWith(TARBALL_PREFIX)) {
      out.push(finding('lockfile', 'pnpm-lock.yaml', i + 1, `${m[1]} tarball is missing or not under ${TARBALL_PREFIX}`));
    }
  }
  if (count === 0) out.push(finding('lockfile', 'pnpm-lock.yaml', 0, 'no @spec-kitty/* package entries found'));
  return out;
}

/** Each workspace package declares a typecheck script. */
export function checkTypecheckScripts(manifests) {
  return manifests
    .filter(({ isWorkspace }) => isWorkspace)
    .filter(({ json }) => typeof json.scripts?.typecheck !== 'string')
    .map(({ file }) => finding('typecheck-script', file, 0, 'workspace package has no typecheck script'));
}

const CHANGED_ONLY = [
  new RegExp('--' + 'changed'),
  new RegExp('git\\s+' + 'diff'),
  new RegExp('lint' + '-staged'),
];

/** Gate scripts evaluate full packages; never changed-files modes. */
export function checkGateScripts(file, scripts) {
  const out = [];
  for (const [key, cmd] of Object.entries(scripts)) {
    if (typeof cmd === 'string' && CHANGED_ONLY.some((re) => re.test(cmd))) {
      out.push(finding('changed-files-gate', file, 0, `script ${key} uses a changed-files mode`));
    }
  }
  return out;
}

const LINTABLE = new Set([
  'ts', 'tsx', 'mts', 'cts', 'js', 'jsx', 'mjs', 'cjs', 'css', 'scss', 'less', 'html', 'vue', 'svelte', 'json',
]);

/** Plant payloads must not be lintable or compilable. plant.json is the one config file. */
export function checkPlantFiles(paths) {
  return paths
    .filter((p) => p.startsWith('gates/plants/'))
    .filter((p) => !p.endsWith('/plant.json'))
    .filter((p) => LINTABLE.has(p.split('.').pop()))
    .map((p) => finding('plant-lintable', p, 0, 'lintable extension under gates/plants'));
}

// `proof-leg` is the matrix job, `proof` the coverage/assemble job, `all` the aggregate (contracts/ci-gates.md).
const GATE_EXCLUDED = new Set(['proof', 'proof-leg', 'all']);

function walk(node, visit) {
  if (Array.isArray(node)) node.forEach((v) => walk(v, visit));
  else if (node && typeof node === 'object') {
    visit(node);
    Object.values(node).forEach((v) => walk(v, visit));
  }
}

/** Forbidden triggers, valid for any workflow file. */
export function checkWorkflowTriggers(file, doc) {
  const on = doc?.on ?? doc?.[true] ?? {};
  const keys = typeof on === 'string' ? [on] : Array.isArray(on) ? on : Object.keys(on);
  return keys
    .filter((k) => k === 'pull_request_target' || k === 'workflow_run')
    .map((k) => finding('workflow-trigger', file, 0, `forbidden trigger ${k}`));
}

/**
 * Job display names beginning `Gate:` are reserved for ci.yml, where they are the required checks. In any other
 * workflow file such a name could imitate (or shadow) a required status check, so it is rejected.
 */
export function checkGateJobNames(file, doc) {
  return Object.entries(doc?.jobs ?? {})
    .filter(([id, job]) => /^\s*gate\s*:/i.test(String(job?.name ?? '')) || /^\s*gate\s*:/i.test(id))
    .map(([id]) => finding('gate-name', file, 0, `job ${id} uses the reserved 'Gate:' name outside ci.yml`));
}

/** Full ci.yml rules. Gate ids come from job ids and matrix.gate values, never display names. */
export function checkWorkflow(file, doc, plantDirs) {
  const out = [];
  const add = (rule, message) => out.push(finding(rule, file, 0, message));
  const on = doc?.on ?? {};
  const keys = Object.keys(typeof on === 'object' && !Array.isArray(on) ? on : {});
  out.push(...checkWorkflowTriggers(file, doc));
  for (const k of keys) if (!['pull_request', 'push'].includes(k)) add('workflow-trigger', `trigger ${k} not allowed`);
  for (const k of ['pull_request', 'push']) {
    const branches = on[k]?.branches;
    if (!Array.isArray(branches) || branches.length !== 1 || branches[0] !== 'main') {
      add('workflow-trigger', `${k} must target main only`);
    }
  }
  const readOnly = (p) => p && typeof p === 'object' && p.contents === 'read';
  if (!readOnly(doc.permissions)) add('workflow-permissions', 'workflow-level permissions must include contents: read');
  const jobs = doc.jobs ?? {};
  for (const [id, job] of Object.entries(jobs)) {
    if (!readOnly(job.permissions)) add('workflow-permissions', `job ${id} lacks permissions contents: read`);
    const images = [];
    const isMatrixImage = typeof job.container === 'string' && /^\$\{\{\s*matrix\.image\s*\}\}$/.test(job.container.trim());
    if (isMatrixImage) {
      // Container comes from the matrix: every include's image must be empty (runner leg) or digest-pinned.
      for (const inc of job.strategy?.matrix?.include ?? []) if (inc?.image) images.push(String(inc.image));
      // ... and so must every value of a plain `matrix.image` axis.
      const axis = job.strategy?.matrix?.image;
      for (const v of [axis ?? []].flat()) if (v) images.push(String(v));
    } else if (typeof job.container === 'string') images.push(job.container);
    else if (job.container?.image) images.push(job.container.image);
    for (const svc of Object.values(job.services ?? {})) if (svc?.image) images.push(svc.image);
    for (const img of images) {
      if (!/@sha256:[0-9a-f]{64}/.test(img)) add('image-digest', `job ${id} image is not digest-pinned`);
    }
  }
  walk(doc, (node) => {
    if ('continue-on-error' in node) add('continue-on-error', 'continue-on-error is forbidden');
    if (typeof node.run === 'string') {
      for (const m of node.run.matchAll(/\b[\w.-]+\.[\w.-]+\/[\w./-]+:[\w.-]+(?:@sha256:[0-9a-f]+)?/g)) {
        if (!m[0].includes('@sha256:') && /(docker|mcr|ghcr|quay|\.io|\.com)/.test(m[0])) {
          add('image-digest', 'container image reference in a run step is not digest-pinned');
        }
      }
    }
    if (node.env && typeof node.env === 'object') {
      for (const [k, v] of Object.entries(node.env)) {
        if (/^(VITE|STORYBOOK)_/.test(k) && /secrets\./.test(String(v))) add('secret-env', `${k} references a secret`);
      }
    }
    if (typeof node.uses === 'string') {
      const uses = node.uses;
      if (!uses.startsWith('./') && !/@[0-9a-f]{40}(\s|$)/.test(uses)) add('action-pin', `${uses.split('@')[0]} is not pinned to a 40-hex SHA`);
      if (uses.startsWith('actions/checkout') && node.with?.['persist-credentials'] !== false) {
        add('checkout-credentials', 'actions/checkout without persist-credentials: false');
      }
      if (uses.startsWith('actions/upload-artifact') && String(node.with?.['retention-days']) !== '1') {
        add('artifact-retention', 'upload-artifact without retention-days: 1');
      }
      if (
        uses.startsWith('actions/upload-artifact') &&
        /trace|video|playwright-report|test-results/i.test(String(node.with?.path ?? '')) &&
        !/sanitis|sanitiz/i.test(String(node.name ?? ''))
      ) {
        add('trace-upload', 'Playwright trace/video upload step does not name the sanitiser');
      }
    }
  });
  const ids = Object.keys(jobs);
  const gateIds = ids.filter((id) => !GATE_EXCLUDED.has(id)).sort();
  for (const ex of GATE_EXCLUDED) if (!ids.includes(ex)) add('gate-coverage', `job ${ex} is missing`);
  const matrix = jobs['proof-leg']?.strategy?.matrix?.gate;
  const matrixIds = Array.isArray(matrix) ? [...matrix] : [];
  if (!Array.isArray(matrix)) add('gate-coverage', 'proof-leg job has no matrix gate list');
  const sorted = (a) => [...a].sort().join(',');
  if (new Set(matrixIds).size !== matrixIds.length) add('gate-coverage', 'proof matrix gate ids are not distinct');
  if (new Set(plantDirs).size !== plantDirs.length) add('gate-coverage', 'plant directory names are not distinct');
  if (sorted(gateIds) !== sorted(matrixIds)) add('gate-coverage', 'gate job ids differ from the proof matrix gate list');
  if (sorted(matrixIds) !== sorted(plantDirs)) add('gate-coverage', 'proof matrix gate list differs from gates/plants directories');
  return out;
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_CHUNKS = new Set(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND']);

/** Only critical chunks plus palette and transparency; fails closed on malformed input. */
export function checkPng(file, buf) {
  const bad = (message) => [finding('png-chunks', file, 0, message)];
  if (buf.length < 8 || PNG_SIG.some((b, i) => buf[i] !== b)) return bad('not a PNG');
  let pos = 8;
  let first = true;
  while (pos < buf.length) {
    if (pos + 12 > buf.length) return bad('truncated chunk');
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    if (!PNG_CHUNKS.has(type)) return bad(`chunk ${type} is not allowed`);
    if (first && type !== 'IHDR') return bad('first chunk is not IHDR');
    first = false;
    pos += 12 + len;
    if (pos > buf.length) return bad('truncated chunk');
    if (type === 'IEND') return pos === buf.length ? [] : bad('data after IEND');
  }
  return bad('missing IEND');
}

const SUFFIX = /-(chromium|firefox|webkit)(-[a-z0-9]+)?$/;

/** Baselines map 1:1 to story ids when an index is given. */
export function checkBaselines(fileNames, storyIds) {
  if (storyIds === null) return [];
  const out = [];
  const baselineIds = fileNames.filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4).replace(SUFFIX, ''));
  const stories = new Set(storyIds);
  if (baselineIds.length === 0 && stories.size > 0) {
    return [finding('baselines', 'apps/storybook/tests/visual/__snapshots__', 0, 'no baselines but stories exist')];
  }
  for (const id of baselineIds) {
    if (!stories.has(id)) out.push(finding('baselines', id, 0, 'orphan baseline with no story'));
  }
  for (const id of stories) {
    if (!baselineIds.includes(id)) out.push(finding('baselines', id, 0, 'story has no baseline'));
  }
  return out;
}

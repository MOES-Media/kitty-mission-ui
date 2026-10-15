// Cargo exact-pin rule (F-09, NFR-003): every registry version requirement in the root `[workspace.dependencies]` and
// in each member's `[dependencies]`, `[dev-dependencies]` and `[build-dependencies]` is `=x.y.z`. A member may defer to
// the workspace (`{ workspace = true }`); a local `path` crate without a version is not a registry requirement; a git
// dependency is reported. A small line-based TOML-subset reader, Node built-ins only (no new dependency).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const EXACT = /^=\d+\.\d+\.\d+$/;
const MEMBER_TABLES = new Set(['dependencies', 'dev-dependencies', 'build-dependencies']);

const finding = (file, line, message) => ({ rule: 'cargo-pin', file, line, message });

/** The line without a trailing `#` comment (a `#` inside a basic or literal string is kept). */
function stripComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (quote) {
      if (c === '\\' && quote === '"') i += 1;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '#') return line.slice(0, i);
  }
  return line;
}

const unquote = (s) => s.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');

/** `table` names a dependency table: `[dependencies]` or `[target.<cfg>.dependencies]` (and dev/build variants). */
function dependencyTable(table, workspaceRoot) {
  if (workspaceRoot && table === 'workspace.dependencies') return { kind: 'table', workspaceTable: true };
  const parts = table.split('.');
  const last = parts.at(-1);
  if (MEMBER_TABLES.has(table)) return { kind: 'table' };
  if (parts[0] === 'target' && MEMBER_TABLES.has(last)) return { kind: 'table' };
  // `[dependencies.serde]`: one dependency as a sub-table.
  const sub = /^((?:target\..+\.)?(?:dependencies|dev-dependencies|build-dependencies)|workspace\.dependencies)\.([^.]+)$/.exec(table);
  if (sub && (workspaceRoot || sub[1] !== 'workspace.dependencies')) {
    return { kind: 'single', name: unquote(sub[2]), workspaceTable: sub[1] === 'workspace.dependencies' };
  }
  return null;
}

/** Keys of a one-line inline table `{ a = "x", b = true, c = [..] }` that matter here. */
function inlineFields(body) {
  const version = /(?:^|[{,])\s*version\s*=\s*"([^"]*)"/.exec(body);
  return {
    version: version ? version[1] : undefined,
    workspace: /(?:^|[{,])\s*workspace\s*=\s*true\b/.test(body),
    git: /(?:^|[{,])\s*git\s*=/.test(body),
    path: /(?:^|[{,])\s*path\s*=/.test(body),
  };
}

/** The finding message for one dependency, or null when it is pinned (or not a registry requirement). */
function judge(name, fields, workspaceTable) {
  if (fields.workspace) return workspaceTable ? `dependency ${name}: workspace = true is only valid in a member manifest` : null;
  if (fields.git) return `dependency ${name}: a git dependency has no exact =x.y.z pin`;
  if (fields.version === undefined) {
    return fields.path ? null : `dependency ${name}: no version requirement, so no exact =x.y.z pin`;
  }
  return EXACT.test(fields.version) ? null : `dependency ${name}: requirement "${fields.version}" is not an exact =x.y.z pin`;
}

/**
 * Pure: the exact-pin findings of one manifest's text. Every manifest's dependency tables are read; `workspaceRoot`
 * adds `[workspace.dependencies]`, where `workspace = true` is invalid. Each finding names the dependency and `file`.
 */
export function checkCargoManifest(file, text, { workspaceRoot = false } = {}) {
  const out = [];
  let table = null;
  let single = null;
  const flushSingle = () => {
    if (single) {
      const message = judge(single.name, single.fields, single.workspaceTable);
      if (message) out.push(finding(file, single.line, message));
    }
    single = null;
  };
  const lines = String(text).split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = stripComment(raw).trim();
    if (!line) return;
    const header = /^\[\s*([^\][]+?)\s*\]$/.exec(line);
    if (header) {
      flushSingle();
      const t = dependencyTable(header[1].replace(/\s*\.\s*/g, '.'), workspaceRoot);
      table = t?.kind === 'table' ? t : null;
      if (t?.kind === 'single') single = { name: t.name, line: i + 1, fields: {}, workspaceTable: t.workspaceTable };
      return;
    }
    const kv = /^("[^"]+"|'[^']+'|[A-Za-z0-9_.-]+)\s*=\s*(.*)$/.exec(line);
    if (!kv) return;
    const key = kv[1];
    const value = kv[2].trim();
    if (single) {
      if (key === 'version') { single.fields.version = unquote(value); single.line = i + 1; }
      else if (key === 'workspace') single.fields.workspace = value === 'true';
      else if (key === 'git') single.fields.git = true;
      else if (key === 'path') single.fields.path = true;
      return;
    }
    if (!table) return;
    // `serde.version = "1"` / `serde.workspace = true`: dotted keys.
    const dotted = /^([A-Za-z0-9_-]+)\.(version|workspace|git|path)$/.exec(key);
    let name;
    let fields;
    if (dotted) {
      name = dotted[1];
      fields = { [dotted[2]]: dotted[2] === 'version' ? unquote(value) : dotted[2] === 'workspace' ? value === 'true' : true };
    } else if (value.startsWith('{')) {
      name = unquote(key);
      fields = inlineFields(value);
    } else {
      name = unquote(key);
      fields = { version: unquote(value) };
    }
    const message = judge(name, fields, table.workspaceTable);
    if (message) out.push(finding(file, i + 1, message));
  });
  flushSingle();
  return out;
}

/** Pure: the `members` array of the root `[workspace]` table, single- or multi-line. */
export function workspaceMembers(text) {
  const ws = /^\[workspace\]\s*$([\s\S]*?)(?=^\[|(?![\s\S]))/m.exec(String(text));
  if (!ws) return [];
  const arr = /^\s*members\s*=\s*\[([\s\S]*?)\]/m.exec(ws[1].split('\n').map(stripComment).join('\n'));
  if (!arr) return [];
  return [...arr[1].matchAll(/"([^"]*)"|'([^']*)'/g)].map((m) => m[1] ?? m[2]);
}

/** Member directories, with a trailing `/*` glob expanded to the directories below it that hold a Cargo.toml. */
function expandMembers(root, members) {
  const out = [];
  for (const m of members) {
    if (m.endsWith('/*')) {
      const base = m.slice(0, -2);
      const dir = join(root, base);
      if (!existsSync(dir)) continue;
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory() && existsSync(join(dir, e.name, 'Cargo.toml'))) out.push(`${base}/${e.name}`);
      }
    } else out.push(m);
  }
  return out;
}

/** The exact-pin findings of the workspace at `root`: the root manifest plus every member manifest. */
export function checkCargoPins(root) {
  const rootText = readFileSync(join(root, 'Cargo.toml'), 'utf8');
  const findings = checkCargoManifest('Cargo.toml', rootText, { workspaceRoot: true });
  for (const dir of expandMembers(root, workspaceMembers(rootText))) {
    const file = `${dir}/Cargo.toml`;
    let text;
    try {
      text = readFileSync(join(root, file), 'utf8');
    } catch {
      findings.push(finding(file, 0, 'workspace member manifest cannot be read'));
      continue;
    }
    findings.push(...checkCargoManifest(file, text));
  }
  return findings;
}

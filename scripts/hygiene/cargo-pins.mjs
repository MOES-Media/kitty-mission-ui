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

const KEYPART = '(?:"[^"]*"|\'[^\']*\'|[A-Za-z0-9_-]+)';
/** A `key = value` line; the key is one or more bare or quoted parts joined by dots, spaces allowed around dots. */
const KV = new RegExp(`^(${KEYPART}(?:\\s*\\.\\s*${KEYPART})*)\\s*=\\s*(.*)$`);
const FIELDS = new Set(['version', 'workspace', 'git', 'path']);

/** A dotted key or header split on the dots outside quotes, each part trimmed and unquoted. */
function splitDots(s) {
  const parts = [];
  let cur = '';
  let quote = null;
  for (const c of s) {
    if (quote) {
      cur += c;
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") { quote = c; cur += c; }
    else if (c === '.') { parts.push(cur); cur = ''; }
    else cur += c;
  }
  parts.push(cur);
  return parts.map(unquote);
}

/** Open brackets minus closed ones outside strings: a value continues on the next line while this is positive. */
function depth(value) {
  let d = 0;
  let quote = null;
  for (let i = 0; i < value.length; i += 1) {
    const c = value[i];
    if (quote) {
      if (c === '\\' && quote === '"') i += 1;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '[' || c === '{') d += 1;
    else if (c === ']' || c === '}') d -= 1;
  }
  return d;
}

/** The logical lines of a manifest: comments stripped, a multi-line value joined to its key. */
function* logicalLines(text) {
  const lines = String(text).split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    let line = stripComment(lines[i]).trim();
    if (!line) continue;
    const start = i + 1;
    if (!line.startsWith('[') || line.startsWith('[[')) {
      while (depth(line) > 0 && i + 1 < lines.length) { i += 1; line += ` ${stripComment(lines[i]).trim()}`; }
    }
    yield { line, no: start };
  }
}

/** `[x]` or `[[x]]`: the header kind and its dotted parts, or null when the line is not a header. */
function parseHeader(line) {
  const array = /^\[\[\s*(.+?)\s*\]\]$/.exec(line);
  if (array) return { array: true, parts: splitDots(array[1]) };
  const table = /^\[\s*([^\][]+?)\s*\]$/.exec(line);
  return table ? { array: false, parts: splitDots(table[1]) } : null;
}

/** What a `[header]` is: a dependency table, one dependency as a sub-table, a patch/replace source override, or other. */
function classify(parts, workspaceRoot) {
  const [first] = parts;
  if (first === 'patch') return { kind: parts.length <= 2 ? 'patch' : 'patch-entry', name: parts.at(-1) };
  if (first === 'replace') return { kind: parts.length === 1 ? 'patch' : 'patch-entry', name: parts.at(-1) };
  if (workspaceRoot && first === 'workspace' && parts[1] === 'dependencies') {
    if (parts.length === 2) return { kind: 'table', workspaceTable: true };
    if (parts.length === 3) return { kind: 'single', name: parts[2], workspaceTable: true };
    return { kind: 'other' };
  }
  if (parts.length === 1 && first === 'workspace') return { kind: 'workspace' };
  const at = first === 'target' ? 2 : 0;
  if (MEMBER_TABLES.has(parts[at]) && parts.length >= at + 1) {
    if (parts.length === at + 1) return { kind: 'table' };
    if (parts.length === at + 2) return { kind: 'single', name: parts[at + 1] };
  }
  return { kind: 'other' };
}

/** Keys of a one-line inline table `{ a = "x", b = true, c = [..] }` that matter here. */
function inlineFields(body) {
  const key = (name) => `(?:^|[{,])\\s*["']?${name}["']?\\s*=\\s*`;
  const version = new RegExp(`${key('version')}"([^"]*)"`).exec(body);
  return {
    version: version ? version[1] : undefined,
    workspace: new RegExp(`${key('workspace')}true\\b`).test(body),
    git: new RegExp(key('git')).test(body),
    path: new RegExp(key('path')).test(body),
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

const patchMessage = (name) => `patch entry ${name}: a [patch.*] or [replace] source override replaces a pinned dependency and is not allowed`;

/**
 * Pure: the exact-pin findings of one manifest's text. Every manifest's dependency tables are read; `workspaceRoot`
 * adds `[workspace.dependencies]`, where `workspace = true` is invalid. Each finding names the dependency and `file`.
 * The reader fails closed: a line it cannot parse inside a dependency table, and every `[patch.*]` or `[replace]`
 * entry, is a finding.
 */
export function checkCargoManifest(file, text, { workspaceRoot = false } = {}) {
  const out = [];
  let ctx = { kind: 'root' };
  let deps = new Map();
  const flush = () => {
    for (const [name, entry] of deps) {
      const message = judge(name, entry.fields, ctx.workspaceTable);
      if (message) out.push(finding(file, entry.line, message));
    }
    deps = new Map();
  };
  for (const { line, no } of logicalLines(text)) {
    if (line.startsWith('[')) {
      flush();
      const header = parseHeader(line);
      if (!header) {
        out.push(finding(file, no, 'unparsed table header, so the tables below it are not checked'));
        ctx = { kind: 'other' };
      } else if (header.array) ctx = { kind: 'other' };
      else {
        ctx = classify(header.parts, workspaceRoot);
        if (ctx.kind === 'single') deps.set(ctx.name, { line: no, fields: {} });
        if (ctx.kind === 'patch-entry') out.push(finding(file, no, patchMessage(ctx.name)));
      }
      continue;
    }
    const kv = KV.exec(line);
    const parts = kv ? splitDots(kv[1]) : [];
    const value = kv ? kv[2].trim() : '';
    if (ctx.kind === 'table' || ctx.kind === 'single') {
      if (!kv) {
        out.push(finding(file, no, `unparsed line in a dependency table: ${line.slice(0, 40)}`));
      } else if (ctx.kind === 'single') {
        const entry = deps.get(ctx.name);
        if (parts.length === 1 && FIELDS.has(parts[0])) {
          if (parts[0] === 'version') { entry.fields.version = unquote(value); entry.line = no; }
          else if (parts[0] === 'workspace') entry.fields.workspace = value === 'true';
          else entry.fields[parts[0]] = true;
        }
      } else {
        const entry = deps.get(parts[0]) ?? { line: no, fields: {} };
        deps.set(parts[0], entry);
        if (parts.length === 1) {
          entry.fields = value.startsWith('{') ? inlineFields(value) : { version: unquote(value) };
        } else if (parts.length === 2 && FIELDS.has(parts[1])) {
          if (parts[1] === 'version') { entry.fields.version = unquote(value); entry.line = no; }
          else if (parts[1] === 'workspace') entry.fields.workspace = value === 'true';
          else entry.fields[parts[1]] = true;
        }
      }
    } else if (ctx.kind === 'patch') {
      out.push(finding(file, no, patchMessage(kv ? parts.join('.') : line.slice(0, 40))));
    } else if (kv && (ctx.kind === 'root' || ctx.kind === 'workspace')) {
      const [first, second] = parts;
      if (ctx.kind === 'root' && (first === 'patch' || first === 'replace')) {
        out.push(finding(file, no, patchMessage(parts.slice(1).join('.'))));
      } else if (
        (ctx.kind === 'root' && (MEMBER_TABLES.has(first) || first === 'target' || (first === 'workspace' && (second === 'dependencies' || (parts.length === 1 && /\bdependencies\b/.test(value))))))
        || (ctx.kind === 'workspace' && first === 'dependencies')
      ) {
        out.push(finding(file, no, `dependency keys written as ${parts[0]}.… outside a [table] are not read by this check`));
      }
    }
  }
  flush();
  return out;
}

/** Pure: the `members` array of the root `[workspace]` table (header, root-level dotted key or inline table). */
export function workspaceMembers(text) {
  let table = 'root';
  const strings = (s) => [...s.matchAll(/"([^"]*)"|'([^']*)'/g)].map((m) => m[1] ?? m[2]);
  for (const { line } of logicalLines(text)) {
    if (line.startsWith('[')) {
      const header = parseHeader(line);
      table = header && !header.array && header.parts.length === 1 && header.parts[0] === 'workspace' ? 'workspace' : 'other';
      continue;
    }
    const kv = KV.exec(line);
    if (!kv) continue;
    const parts = splitDots(kv[1]);
    const value = kv[2];
    if (table === 'workspace' && parts.length === 1 && parts[0] === 'members') return strings(value);
    if (table === 'root' && parts.length === 2 && parts[0] === 'workspace' && parts[1] === 'members') return strings(value);
    if (table === 'root' && parts.length === 1 && parts[0] === 'workspace') {
      const inline = /members\s*=\s*(\[[^\]]*\])/.exec(value);
      if (inline) return strings(inline[1]);
    }
  }
  return [];
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

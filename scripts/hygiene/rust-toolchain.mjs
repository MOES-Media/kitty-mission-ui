// Rust toolchain pin rule (NFR-003, CODE-TEST-005): `rust-toolchain.toml` pins an exact release. Its `[toolchain]`
// `channel` must be `x.y.z`; a floating channel (`stable`, `beta`, `nightly`), a minor-only `1.98` or a dated
// nightly is reported. A line-based TOML-subset reader, Node built-ins only (no new dependency).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const TOOLCHAIN_FILE = 'rust-toolchain.toml';
const EXACT = /^\d+\.\d+\.\d+$/;

export const LEGACY_TOOLCHAIN_FILE = 'rust-toolchain';

const finding = (line, message, file = TOOLCHAIN_FILE) => ({ rule: 'rust-toolchain-pin', file, line, message });

/** Pure: the findings for the text of `rust-toolchain.toml`. Exactly one `[toolchain]` `channel`, an exact x.y.z. */
export function checkRustToolchain(text) {
  let table = null;
  const channels = [];
  String(text).split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/\s+#.*$/, '').trim();
    const header = /^\[\s*([^\][]+?)\s*\]$/.exec(line);
    if (header) { table = header[1]; return; }
    const kv = /^channel\s*=\s*(?:"([^"]*)"|'([^']*)'|(.*))$/.exec(line);
    if (kv && table === 'toolchain') channels.push({ line: i + 1, value: kv[1] ?? kv[2] ?? kv[3] });
  });
  if (channels.length === 0) return [finding(0, 'no [toolchain] channel, so the toolchain is not pinned to an exact x.y.z release')];
  if (channels.length > 1) return [finding(channels[1].line, 'channel is set more than once')];
  const { line, value } = channels[0];
  return EXACT.test(value) ? [] : [finding(line, `channel "${value}" is not an exact x.y.z release`)];
}

/** The findings for the workspace at `root`: a Rust workspace (root Cargo.toml) needs an exact toolchain pin. */
export function checkRustToolchainPin(root) {
  if (!existsSync(join(root, 'Cargo.toml'))) return [];
  // rustup reads the extensionless legacy file first, so it silently overrides the pinned `.toml`.
  const legacy = existsSync(join(root, LEGACY_TOOLCHAIN_FILE))
    ? [finding(0, 'a legacy rust-toolchain file overrides rust-toolchain.toml: delete it and pin the toolchain in rust-toolchain.toml only', LEGACY_TOOLCHAIN_FILE)]
    : [];
  const path = join(root, TOOLCHAIN_FILE);
  if (!existsSync(path)) return [...legacy, finding(0, 'missing: a Cargo workspace must pin its toolchain to an exact x.y.z release')];
  return [...legacy, ...checkRustToolchain(readFileSync(path, 'utf8'))];
}

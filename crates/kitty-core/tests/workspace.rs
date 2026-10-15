//! FR-005: the Cargo workspace has exactly the expected members. Removing one from the root `members` list fails
//! this test. WP07 added `kitty-stub` to the expected set when it added the crate.

use std::collections::BTreeSet;
use std::process::Command;

const EXPECTED: [&str; 4] = [
    "kitty-core",
    "kitty-dashboard",
    "kitty-desktop",
    "kitty-stub",
];

/// Where each member lives, relative to the workspace root. The dashboard crate is `apps/dashboard/server`, so the
/// app root `apps/dashboard/` stays free for the web frontend of #21 (CODE-BOUNDARY-007).
const MANIFESTS: [(&str, &str); 4] = [
    ("kitty-core", "crates/kitty-core/Cargo.toml"),
    ("kitty-dashboard", "apps/dashboard/server/Cargo.toml"),
    ("kitty-desktop", "apps/desktop/src-tauri/Cargo.toml"),
    ("kitty-stub", "crates/kitty-stub/Cargo.toml"),
];

/// `cargo metadata --no-deps` for the workspace that contains this crate, as raw JSON text.
fn metadata() -> String {
    let out = Command::new(env!("CARGO"))
        .args(["metadata", "--format-version", "1", "--no-deps", "--frozen"])
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output()
        .expect("cargo metadata runs");
    assert!(
        out.status.success(),
        "cargo metadata failed: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    String::from_utf8(out.stdout).expect("cargo metadata prints UTF-8")
}

/// The ids listed in the top-level `"workspace_members"` array.
fn member_ids(json: &str) -> Vec<String> {
    let key = "\"workspace_members\":[";
    let start = json.find(key).expect("workspace_members present") + key.len();
    let end = start + json[start..].find(']').expect("workspace_members closes");
    json[start..end]
        .split(',')
        .map(|s| s.trim().trim_matches('"').to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

/// The `"name"` of the package object whose `"id"` is `id`: the nearest `"name":"` before that id. Target and
/// dependency objects carry no `"id"`, so only a package object can match.
fn package_name(json: &str, id: &str) -> String {
    let at = json
        .find(&format!("\"id\":\"{id}\""))
        .unwrap_or_else(|| panic!("package with id {id} present"));
    let key = "\"name\":\"";
    let from = json[..at].rfind(key).expect("package name precedes its id") + key.len();
    let len = json[from..].find('"').expect("name closes");
    json[from..from + len].to_string()
}

/// The `"manifest_path"` of the package object whose `"id"` is `id`: the nearest one after that id, with `/`
/// separators.
fn manifest_path(json: &str, id: &str) -> String {
    let at = json
        .find(&format!("\"id\":\"{id}\""))
        .unwrap_or_else(|| panic!("package with id {id} present"));
    let key = "\"manifest_path\":\"";
    let from = at + json[at..].find(key).expect("manifest_path follows the id") + key.len();
    let len = json[from..].find('"').expect("manifest_path closes");
    json[from..from + len].replace("\\\\", "/")
}

#[test]
fn workspace_members_live_at_the_expected_paths() {
    let json = metadata();
    let mut checked = 0;
    for id in member_ids(&json) {
        let name = package_name(&json, &id);
        let (_, expected) = MANIFESTS
            .iter()
            .find(|(n, _)| *n == name)
            .unwrap_or_else(|| panic!("unexpected member {name}"));
        let path = manifest_path(&json, &id);
        assert!(
            path.ends_with(&format!("/{expected}")),
            "{name} is at {path}, expected {expected}"
        );
        checked += 1;
    }
    assert_eq!(checked, MANIFESTS.len());
}

#[test]
fn workspace_members_are_exactly_the_expected_packages() {
    let json = metadata();
    let ids = member_ids(&json);
    assert_eq!(ids.len(), EXPECTED.len(), "member count; ids: {ids:?}");
    let names: BTreeSet<String> = ids.iter().map(|id| package_name(&json, id)).collect();
    let expected: BTreeSet<String> = EXPECTED.iter().map(|s| s.to_string()).collect();
    assert_eq!(names, expected);
}

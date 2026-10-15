//! FR-005: the Cargo workspace has exactly the expected members. Removing one from the root `members` list fails
//! this test. WP07 adds `kitty-stub` to the expected set when it adds the crate.

use std::collections::BTreeSet;
use std::process::Command;

const EXPECTED: [&str; 3] = ["kitty-core", "kitty-dashboard", "kitty-desktop"];

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

#[test]
fn workspace_members_are_exactly_the_expected_packages() {
    let json = metadata();
    let ids = member_ids(&json);
    assert_eq!(ids.len(), EXPECTED.len(), "member count; ids: {ids:?}");
    let names: BTreeSet<String> = ids.iter().map(|id| package_name(&json, id)).collect();
    let expected: BTreeSet<String> = EXPECTED.iter().map(|s| s.to_string()).collect();
    assert_eq!(names, expected);
}

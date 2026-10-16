//! The embedded route table and request-target building (FR-001, FR-006).

use std::collections::BTreeMap;
use std::sync::OnceLock;

use percent_encoding::{utf8_percent_encode, AsciiSet, NON_ALPHANUMERIC};
use serde::Deserialize;

use crate::client::TransportFailure;

/// The path prefix of every service route.
pub const API_PREFIX: &str = "/api/v1";

/// Everything except `ALPHA`, `DIGIT`, `-`, `.`, `_` and `~` is percent-encoded (path values, query names and values).
const ENCODE: &AsciiSet = &NON_ALPHANUMERIC
    .remove(b'-')
    .remove(b'.')
    .remove(b'_')
    .remove(b'~');

/// The embedded copy of the gate-checked route table.
const ROUTES_JSON: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../contracts/fixtures/mission-status.routes.json"
));

/// What a route does.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RouteKind {
    Read,
    Stream,
}

/// One entry of the route table.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct RouteEntry {
    #[serde(rename = "operationId")]
    pub operation_id: String,
    #[serde(rename = "path")]
    pub path_template: String,
    pub kind: RouteKind,
    /// Refusal schema name to the statuses it is declared for.
    #[serde(default)]
    pub refusals: BTreeMap<String, Vec<u16>>,
}

/// The parsed table. The embedded file is checked by `Gate: contract` in the build, so a parse failure is a defect of
/// the build itself and can only surface at the first call; no request path unwraps on it.
fn table() -> &'static [RouteEntry] {
    static TABLE: OnceLock<Vec<RouteEntry>> = OnceLock::new();
    TABLE.get_or_init(|| {
        serde_json::from_str(ROUTES_JSON).unwrap_or_else(|e| {
            // Unreachable for a gate-checked build; an empty table makes every operation `UnknownOperation`.
            eprintln!("kitty-core: embedded routes.json does not parse: {e}");
            Vec::new()
        })
    })
}

/// The `kind: read` entries of the embedded route table.
pub fn read_operations() -> impl Iterator<Item = &'static RouteEntry> {
    table().iter().filter(|e| e.kind == RouteKind::Read)
}

/// The entry of a stream operation, or of any other kind, by id.
pub(crate) fn entry(operation_id: &str) -> Option<&'static RouteEntry> {
    table().iter().find(|e| e.operation_id == operation_id)
}

/// A read to relay: the operation, its path values and its query pairs (in the caller's order).
#[derive(Debug, Clone, Copy)]
pub struct ReadRequest<'a> {
    pub operation_id: &'a str,
    pub path: &'a [(&'a str, &'a str)],
    pub query: &'a [(&'a str, &'a str)],
}

fn invalid_path_value(value: &str) -> bool {
    value.is_empty()
        || value == "."
        || value == ".."
        || value.contains(['/', '\\'])
        || value.chars().any(char::is_control)
}

impl ReadRequest<'_> {
    /// The request target: `/api/v1` + the filled template + `?query`. Nothing is sent when this is an error.
    pub fn target(&self) -> Result<String, TransportFailure> {
        let route = entry(self.operation_id)
            .filter(|e| e.kind == RouteKind::Read)
            .ok_or_else(|| TransportFailure::UnknownOperation(self.operation_id.to_owned()))?;
        let mut target = String::from(API_PREFIX);
        let mut rest = route.path_template.as_str();
        while let Some(open) = rest.find('{') {
            target.push_str(&rest[..open]);
            let after = &rest[open + 1..];
            let Some(close) = after.find('}') else {
                // A template without a closing brace cannot be filled.
                return Err(TransportFailure::MissingParameter(after.to_owned()));
            };
            let name = &after[..close];
            let value = self
                .path
                .iter()
                .find(|(n, _)| *n == name)
                .map(|(_, v)| *v)
                .ok_or_else(|| TransportFailure::MissingParameter(name.to_owned()))?;
            if invalid_path_value(value) {
                return Err(TransportFailure::InvalidParameter(name.to_owned()));
            }
            target.extend(utf8_percent_encode(value, ENCODE));
            rest = &after[close + 1..];
        }
        target.push_str(rest);
        for (index, (name, value)) in self.query.iter().enumerate() {
            target.push(if index == 0 { '?' } else { '&' });
            target.extend(utf8_percent_encode(name, ENCODE));
            target.push('=');
            target.extend(utf8_percent_encode(value, ENCODE));
        }
        Ok(target)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn target(
        op: &str,
        path: &[(&str, &str)],
        query: &[(&str, &str)],
    ) -> Result<String, TransportFailure> {
        ReadRequest {
            operation_id: op,
            path,
            query,
        }
        .target()
    }

    #[test]
    fn the_table_has_nine_reads_and_one_stream() {
        assert_eq!(read_operations().count(), 9);
        assert_eq!(
            table()
                .iter()
                .filter(|e| e.kind == RouteKind::Stream)
                .count(),
            1
        );
    }

    #[test]
    fn a_filled_template_gets_the_api_prefix() {
        assert_eq!(
            target(
                "getWorkPackage",
                &[("missionId", "M1"), ("wpId", "WP01")],
                &[]
            ),
            Ok("/api/v1/missions/M1/work-packages/WP01".to_owned())
        );
        assert_eq!(
            target("getProject", &[], &[]),
            Ok("/api/v1/project".to_owned())
        );
    }

    #[test]
    fn unknown_and_non_read_operations_are_refused() {
        assert_eq!(
            target("nope", &[], &[]),
            Err(TransportFailure::UnknownOperation("nope".to_owned()))
        );
        assert_eq!(
            target("streamEvents", &[], &[]),
            Err(TransportFailure::UnknownOperation(
                "streamEvents".to_owned()
            ))
        );
    }

    #[test]
    fn an_unfilled_placeholder_is_refused() {
        assert_eq!(
            target("getMission", &[], &[]),
            Err(TransportFailure::MissingParameter("missionId".to_owned()))
        );
        assert_eq!(
            target("getWorkPackage", &[("missionId", "M1")], &[]),
            Err(TransportFailure::MissingParameter("wpId".to_owned()))
        );
    }

    #[test]
    fn unsafe_path_values_are_refused() {
        let bad = [
            "", ".", "..", "a/b", "a\\b", "a\nb", "a\0b", "a\u{7f}b", "/", "a\tb",
        ];
        let mut ran = 0;
        for value in bad {
            assert_eq!(
                target("getMission", &[("missionId", value)], &[]),
                Err(TransportFailure::InvalidParameter("missionId".to_owned())),
                "{value:?}"
            );
            ran += 1;
        }
        assert_eq!(ran, 10);
        // Positive control: dots inside a value, and a plain value, pass.
        assert_eq!(
            target("getMission", &[("missionId", "a.b..c")], &[]),
            Ok("/api/v1/missions/a.b..c".to_owned())
        );
    }

    #[test]
    fn values_are_percent_encoded_except_unreserved() {
        assert_eq!(
            target("getMission", &[("missionId", "a b%é~-_.")], &[]),
            Ok("/api/v1/missions/a%20b%25%C3%A9~-_.".to_owned())
        );
        assert_eq!(
            target(
                "getArtifactContent",
                &[("missionId", "M1")],
                &[("path", "a b/c"), ("z k", "1&2=3"), ("path", "../x")]
            ),
            Ok(
                "/api/v1/missions/M1/artifacts/content?path=a%20b%2Fc&z%20k=1%262%3D3&path=..%2Fx"
                    .to_owned()
            )
        );
    }
}

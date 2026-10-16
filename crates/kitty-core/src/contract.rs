//! Contract pin and document check (IC-06, FR-011 to FR-013).
//!
//! The pinned digest is derived at run time from the embedded bundle, never typed in (FR-012). Both sides, the
//! pinned document and the served one, go through the same [`digest_of`]: parse (JSON first, YAML only when JSON
//! fails), write the canonical form of `contracts/bundled-document.md`, hash it with SHA-256.
//!
//! **Not authentication (R2-01).** Equal digests mean "the same contract". They do not mean "the binary we
//! launched": any local process can serve the same document. The digest is not a trust boundary.
//!
//! **Known limit (R-04).** A served YAML 1.1 document with quirks that `yaml_serde` reads differently from the
//! bundle (for example `0o17` or `.inf`) surfaces as a mismatch. That is accepted and fails closed.

use std::borrow::Cow;
use std::fmt;
use std::sync::OnceLock;

use http_body_util::{BodyExt, Empty};
use hyper::body::Bytes;
use hyper::http::header::{ACCEPT, HOST};
use hyper::http::{HeaderValue, Request};
use serde_json::Value;
use sha2::{Digest as _, Sha256};

use crate::client::{connect, hyper_failure, ContractClient, TransportFailure};

/// The path of the contract document.
pub const CONTRACT_PATH: &str = "/api/v1/openapi.yaml";

/// A served contract document larger than this is refused (A-09).
pub const DOCUMENT_CAP: usize = 4 * 1024 * 1024;

const CHECK_ACCEPT: &str = "application/yaml, application/json";

/// The generated bundle (WP02), embedded at build time.
static BUNDLE: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../contracts/fixtures/mission-status.openapi.json"
));

/// 2^53: the largest magnitude at which every integer is exact in an `f64`.
const MAX_EXACT: f64 = 9_007_199_254_740_992.0;

/// SHA-256 of a canonical form: 32 bytes, shown as 64 lowercase hex characters.
#[derive(Clone, Copy, PartialEq, Eq, Hash)]
pub struct Digest([u8; 32]);

impl Digest {
    /// A placeholder for "there is no expected digest": all zero. Only the facade uses it, for a pin that cannot be
    /// parsed (WP09): a `Mismatch` needs an `expected`, and no document hashes to this value.
    pub(crate) const fn unavailable() -> Self {
        Digest([0; 32])
    }

    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.0
    }
}

impl fmt::Display for Digest {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        for byte in self.0 {
            write!(f, "{byte:02x}")?;
        }
        Ok(())
    }
}

impl fmt::Debug for Digest {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Digest({self})")
    }
}

/// The document is neither JSON nor YAML.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParseError {
    pub detail: String,
}

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "unparseable contract document: {}", self.detail)
    }
}

impl std::error::Error for ParseError {}

/// The canonical byte form of a parsed document (`contracts/bundled-document.md`).
///
/// Non-finite numbers cannot occur: neither JSON nor YAML parsing into a [`Value`] yields them.
pub fn canonical_json(value: &Value) -> Vec<u8> {
    let mut out = Vec::new();
    write_canonical(value, &mut out);
    out
}

fn write_canonical(value: &Value, out: &mut Vec<u8>) {
    match value {
        Value::Null => out.extend_from_slice(b"null"),
        Value::Bool(true) => out.extend_from_slice(b"true"),
        Value::Bool(false) => out.extend_from_slice(b"false"),
        Value::Number(n) => write_number(n.as_f64().unwrap_or(0.0), out),
        Value::String(s) => write_string(s, out),
        Value::Array(items) => {
            out.push(b'[');
            for (i, item) in items.iter().enumerate() {
                if i > 0 {
                    out.push(b',');
                }
                write_canonical(item, out);
            }
            out.push(b']');
        }
        Value::Object(map) => {
            let mut members: Vec<(&String, &Value)> = map.iter().collect();
            members.sort_by(|a, b| a.0.as_bytes().cmp(b.0.as_bytes()));
            out.push(b'{');
            for (i, (key, member)) in members.into_iter().enumerate() {
                if i > 0 {
                    out.push(b',');
                }
                write_string(key, out);
                out.push(b':');
                write_canonical(member, out);
            }
            out.push(b'}');
        }
    }
}

fn write_string(s: &str, out: &mut Vec<u8>) {
    // Writing into a `Vec` cannot fail, and a `str` always serialises.
    let _ = serde_json::to_writer(&mut *out, s);
}

/// JavaScript number semantics: through `f64`; `-0` is `0`; an integral value of magnitude up to 2^53 is a plain
/// integer; anything else uses the one shortest round-trip formatter.
fn write_number(x: f64, out: &mut Vec<u8>) {
    if x.is_finite() && x.fract() == 0.0 && x.abs() <= MAX_EXACT {
        // `-0.0 as i64` is 0.
        out.extend_from_slice((x as i64).to_string().as_bytes());
    } else {
        let text = serde_json::to_string(&x).unwrap_or_else(|_| "null".to_owned());
        out.extend_from_slice(text.as_bytes());
    }
}

/// `lowercase_hex(SHA-256(canonical(parse(bytes))))`. JSON is tried first; YAML only when JSON fails (R3-11).
pub fn digest_of(bytes: &[u8]) -> Result<Digest, ParseError> {
    let value: Value = match serde_json::from_slice(bytes) {
        Ok(value) => value,
        Err(json_error) => yaml_serde::from_slice(bytes).map_err(|yaml_error| ParseError {
            detail: format!("not JSON ({json_error}) and not YAML ({yaml_error})"),
        })?,
    };
    Ok(Digest(Sha256::digest(canonical_json(&value)).into()))
}

type PinDigest = Result<Digest, ParseError>;

fn embedded_digest() -> &'static PinDigest {
    static CELL: OnceLock<PinDigest> = OnceLock::new();
    CELL.get_or_init(|| digest_of(BUNDLE))
}

/// The contract the host expects. Its digest is computed on first use and then kept.
#[derive(Clone)]
pub struct ContractPin {
    document: Cow<'static, [u8]>,
    embedded: bool,
    digest: OnceLock<PinDigest>,
}

impl fmt::Debug for ContractPin {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("ContractPin")
            .field("document_bytes", &self.document.len())
            .field("embedded", &self.embedded)
            .finish()
    }
}

impl ContractPin {
    /// The generated bundle, embedded in the binary.
    pub fn embedded() -> Self {
        Self {
            document: Cow::Borrowed(BUNDLE),
            embedded: true,
            digest: OnceLock::new(),
        }
    }

    /// A pin over any document (tests).
    pub fn from_document(document: Vec<u8>) -> Self {
        Self {
            document: Cow::Owned(document),
            embedded: false,
            digest: OnceLock::new(),
        }
    }

    /// The digest of the pinned document. An embedded bundle that cannot be parsed is a programming error that
    /// the tests catch; callers still get an error, not a panic.
    pub fn digest(&self) -> Result<Digest, ParseError> {
        if self.embedded {
            return embedded_digest().clone();
        }
        self.digest
            .get_or_init(|| digest_of(&self.document))
            .clone()
    }
}

/// What the served document was compared against, and what it was.
#[derive(Debug, Clone, PartialEq, Eq)]
#[non_exhaustive]
pub enum Actual {
    Digest(Digest),
    Status { status: u16 },
    Unparseable { detail: String },
    Transport(TransportFailure),
}

/// The served contract is not the pinned one (or could not be read). Fail closed (FR-011).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Mismatch {
    pub expected: Digest,
    pub actual: Actual,
}

/// The result of one contract check.
#[derive(Debug, Clone, PartialEq, Eq)]
#[non_exhaustive]
pub enum CheckOutcome {
    Match {
        digest: Digest,
    },
    Mismatch(Mismatch),
    /// The pinned document itself cannot be parsed, so there is no `expected` digest. Not a `Match`.
    PinUnparseable {
        detail: String,
    },
}

impl ContractClient {
    /// Fetches the contract document and compares its digest with the pin's. Reports exactly what happened; the
    /// supervisor decides what a 503 or a refused connection means while starting.
    pub async fn check_contract(&self, pin: &ContractPin) -> CheckOutcome {
        let expected = match pin.digest() {
            Ok(digest) => digest,
            Err(e) => return CheckOutcome::PinUnparseable { detail: e.detail },
        };
        let mismatch = |actual| CheckOutcome::Mismatch(Mismatch { expected, actual });
        let fetched = tokio::time::timeout(self.timings.read_timeout, self.fetch_document()).await;
        let (status, body) = match fetched {
            Ok(Ok(answer)) => answer,
            Ok(Err(failure)) => return mismatch(Actual::Transport(failure)),
            Err(_) => return mismatch(Actual::Transport(TransportFailure::Timeout)),
        };
        if status != 200 {
            return mismatch(Actual::Status { status });
        }
        let parsed = tokio::task::spawn_blocking(move || digest_of(&body)).await;
        match parsed {
            Ok(Ok(actual)) if actual == expected => CheckOutcome::Match { digest: actual },
            Ok(Ok(actual)) => mismatch(Actual::Digest(actual)),
            Ok(Err(e)) => mismatch(Actual::Unparseable { detail: e.detail }),
            Err(e) => mismatch(Actual::Unparseable {
                detail: format!("digest task failed: {e}"),
            }),
        }
    }

    async fn fetch_document(&self) -> Result<(u16, Vec<u8>), TransportFailure> {
        let mut request = Request::builder()
            .method("GET")
            .uri(CONTRACT_PATH)
            .body(Empty::<Bytes>::new())
            .map_err(|e| TransportFailure::Io(e.to_string()))?;
        let host = HeaderValue::from_str(&self.endpoint.host_header())
            .map_err(|e| TransportFailure::Io(e.to_string()))?;
        request.headers_mut().insert(HOST, host);
        request
            .headers_mut()
            .insert(ACCEPT, HeaderValue::from_static(CHECK_ACCEPT));
        let mut connection = connect(&self.endpoint).await?;
        let response = connection
            .sender
            .send_request(request)
            .await
            .map_err(hyper_failure)?;
        let status = response.status().as_u16();
        if status != 200 {
            return Ok((status, Vec::new()));
        }
        let mut body = response.into_body();
        let mut bytes: Vec<u8> = Vec::new();
        while let Some(frame) = body.frame().await {
            let frame = frame.map_err(hyper_failure)?;
            if let Some(data) = frame.data_ref() {
                if bytes.len() + data.len() > DOCUMENT_CAP {
                    return Err(TransportFailure::BodyTooLarge {
                        limit: DOCUMENT_CAP,
                    });
                }
                bytes.extend_from_slice(data);
            }
        }
        Ok((status, bytes))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn canon(v: Value) -> String {
        String::from_utf8(canonical_json(&v)).expect("canonical form is UTF-8")
    }

    fn canon_text(json_text: &str) -> String {
        canon(serde_json::from_str(json_text).expect("test input is JSON"))
    }

    #[test]
    fn three_key_object_by_hand() {
        // Keys sorted by bytes ("B" < "a" < "b"), no whitespace, arrays keep order.
        let v = json!({"b": [3, 1, 2], "a": "x\"y", "B": null});
        assert_eq!(canon(v), r#"{"B":null,"a":"x\"y","b":[3,1,2]}"#);
    }

    #[test]
    fn key_order_does_not_matter() {
        assert_eq!(
            canon_text(r#"{"a":1,"b":{"c":true,"d":false},"e":[]}"#),
            canon_text(r#"{"e":[],"b":{"d":false,"c":true},"a":1}"#)
        );
    }

    #[test]
    fn number_rules() {
        assert_eq!(canon_text("1.0"), canon_text("1"));
        assert_eq!(canon_text("1.0"), "1");
        assert_eq!(canon_text("-0"), "0");
        assert_eq!(canon_text("-0.0"), "0");
        assert_eq!(canon_text("0"), "0");
        assert_eq!(
            canon_text("9007199254740993"),
            canon_text("9007199254740992")
        );
        assert_eq!(canon_text("9007199254740992"), "9007199254740992");
        assert_eq!(canon_text("0.1"), "0.1");
        assert_eq!(canon_text("1e3"), "1000");
        assert_eq!(canon_text("-5"), "-5");
        assert_ne!(canon_text("0.1"), canon_text("0.2"));
    }

    #[test]
    fn big_and_small_numbers_use_the_one_formatter() {
        let expected = serde_json::to_string(&1e300_f64).unwrap();
        assert_eq!(canon_text("1e300"), expected);
        // Above 2^53 the shortest round-trip text of the f64 is used as is, fraction marker included.
        let above = serde_json::to_string(&9_007_199_254_740_994_f64).unwrap();
        assert_eq!(canon_text("9007199254740994"), above);
    }

    #[test]
    fn nested_arrays_keep_their_order() {
        assert_eq!(canon_text("[[2,1],[[3],[]],1]"), "[[2,1],[[3],[]],1]");
    }

    #[test]
    fn digest_displays_as_64_lowercase_hex() {
        let d = digest_of(b"{}").unwrap();
        let text = d.to_string();
        assert_eq!(text.len(), 64);
        assert!(text
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)));
        // The canonical form of an empty object is the two bytes `{}`.
        assert_eq!(d.as_bytes().as_slice(), Sha256::digest(b"{}").as_slice());
    }

    // ---- digest_of (T033) ----

    fn bundle_value() -> Value {
        serde_json::from_slice(BUNDLE).expect("the bundle is JSON")
    }

    #[test]
    fn json_and_yaml_give_the_same_digest() {
        let json_flow = br#"{"openapi": "3.0.3", "info": {"title": "T", "version": "1"}, "paths": {"/a": {"get": {"responses": {"200": {"description": "ok"}}}}}, "n": [1, 2.5, true, null]}"#;
        let yaml_block = b"n:
  - 1
  - 2.5
  - true
  - null
paths:
  /a:
    get:
      responses:
        '200':
          description: ok
info:
  version: '1'
  title: T
openapi: 3.0.3
";
        assert!(serde_json::from_slice::<Value>(yaml_block).is_err());
        assert_eq!(digest_of(json_flow), digest_of(yaml_block));
        assert!(digest_of(json_flow).is_ok());
    }

    #[test]
    fn json_is_parsed_before_yaml() {
        // Valid JSON that YAML refuses (a surrogate-pair escape): only a JSON-first parse gives a digest.
        let doc = br#"{"a":"\ud83d\ude00"}"#;
        assert!(yaml_serde::from_slice::<Value>(doc).is_err());
        assert_eq!(
            digest_of(doc),
            digest_of("{\"a\":\"\u{1F600}\"}".as_bytes())
        );
        assert!(digest_of(doc).is_ok());
    }

    #[test]
    fn the_real_bundle_survives_a_yaml_round_trip() {
        let value = bundle_value();
        let yaml = yaml_serde::to_string(&value).expect("bundle serialises as YAML");
        assert!(serde_json::from_slice::<Value>(yaml.as_bytes()).is_err());
        let from_yaml = digest_of(yaml.as_bytes()).expect("YAML form parses");
        let from_json = digest_of(BUNDLE).expect("bundle parses");
        assert_eq!(from_yaml, from_json);
    }

    #[test]
    fn a_change_changes_the_digest() {
        let base = bundle_value();
        let original = digest_of(BUNDLE).unwrap();
        let digest = |v: &Value| digest_of(&serde_json::to_vec(v).unwrap()).unwrap();
        assert_eq!(digest(&base), original, "control: unchanged value agrees");

        let mut scalar = base.clone();
        scalar["info"]["version"] = json!("changed");
        let mut removed = base.clone();
        let keys = removed["info"].as_object_mut().unwrap();
        let key = keys.keys().next().cloned().unwrap();
        keys.remove(&key);
        let mut added = base.clone();
        added["paths"]["/api/v1/extra"] = json!({"get": {}});

        let all = [original, digest(&scalar), digest(&removed), digest(&added)];
        for (i, a) in all.iter().enumerate() {
            for b in &all[i + 1..] {
                assert_ne!(a, b);
            }
        }
        assert_eq!(all.len(), 4);
    }

    #[test]
    fn garbage_is_a_parse_error() {
        for garbage in [&b"{{not yaml"[..], b"\xff\xfe\x00garbage", b"a: [1, 2"] {
            assert!(digest_of(garbage).is_err(), "{garbage:?}");
        }
        assert!(
            digest_of(b"a: [1, 2]").is_ok(),
            "control: valid YAML parses"
        );
    }

    #[test]
    fn deeply_nested_input_is_an_error_not_a_crash() {
        let deep = "[".repeat(200_000);
        assert!(digest_of(deep.as_bytes()).is_err());
    }

    #[test]
    fn the_pin_follows_the_embedded_file() {
        let path = concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../contracts/fixtures/mission-status.openapi.json"
        );
        let on_disk = std::fs::read(path).expect("read the bundle from disk");
        assert_eq!(
            ContractPin::embedded().digest().unwrap(),
            digest_of(&on_disk).unwrap()
        );
        // Control: editing a copy changes the digest.
        let mut edited = bundle_value();
        edited["info"]["version"] = json!("edited");
        let copy = ContractPin::from_document(serde_json::to_vec(&edited).unwrap());
        assert_ne!(
            copy.digest().unwrap(),
            ContractPin::embedded().digest().unwrap()
        );
        // An unparseable pin reports an error and does not panic.
        assert!(ContractPin::from_document(b"{{not yaml".to_vec())
            .digest()
            .is_err());
    }
}

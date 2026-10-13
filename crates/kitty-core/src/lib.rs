//! Kitty core: the shared host core used by Kitty Desktop and Kitty Dashboard.
//!
//! This crate is a skeleton. Its real content (the host-side model and services) arrives with #19; for now it
//! carries only enough to be built, linted and tested by `Gate: rust`.

/// The version of this crate, as declared in its `Cargo.toml`.
pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_is_the_manifest_version() {
        assert_eq!(version(), "0.0.0");
    }
}

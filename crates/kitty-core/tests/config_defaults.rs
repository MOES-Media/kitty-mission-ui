//! ARCH-001: `CoreConfig::new(project_root)` fills the documented defaults, and a host overrides one field with
//! struct update syntax.

use std::path::PathBuf;
use std::time::Duration;

use kitty_core::{ContractPin, CoreConfig, RestartPolicy, Timings};

#[test]
fn new_fills_the_documented_defaults() {
    let config = CoreConfig::new(PathBuf::from("/project"));
    assert_eq!(config.project_root, PathBuf::from("/project"));
    assert_eq!(config.timings, Timings::default());
    assert_eq!(config.policy, RestartPolicy::default());
    assert!(config.runtime.is_none());
    assert!(config.env_passthrough.is_empty());
    assert_eq!(
        config.contract.digest().expect("embedded pin parses"),
        ContractPin::embedded()
            .digest()
            .expect("embedded pin parses")
    );
    // The default discovery reads the process environment; it must at least answer without panicking.
    let _ = config.discovery.locate();
    // The default port picker hands out a loopback port.
    assert!(config.ports.pick(&[]).expect("a free port") > 0);
}

#[test]
fn struct_update_syntax_overrides_one_field() {
    let timings = Timings {
        read_timeout: Duration::from_secs(1),
        ..Timings::default()
    };
    let config = CoreConfig {
        timings,
        ..CoreConfig::new(PathBuf::from("/project"))
    };
    assert_eq!(config.timings.read_timeout, Duration::from_secs(1));
    assert_eq!(config.policy, RestartPolicy::default());
}

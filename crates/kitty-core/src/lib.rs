//! Kitty core: the shared host core used by Kitty Desktop and Kitty Dashboard.
//!
//! `Core` (module `facade`) supervises one status service per project and relays its contract; the rest of the
//! public surface of `contracts/kitty-core-api.md` is re-exported here.

pub mod client;
pub mod contract;
pub mod discovery;
pub mod endpoint;
pub mod facade;
pub mod forward;
pub mod routes;
pub mod sse;
pub mod status;
pub mod supervisor;

pub use client::{ContractClient, ReadOutcome, Timings, TransportFailure};
pub use contract::{digest_of, CheckOutcome, ContractPin, Digest, Mismatch};
pub use discovery::{DefaultDiscovery, Discovery, ServiceMissing};
pub use endpoint::ServiceEndpoint;
pub use facade::{Core, CoreConfig, StartError, Subscription};
pub use forward::upstream_request_headers;
pub use routes::{read_operations, ReadRequest};
pub use sse::{ChangeStream, StreamEvent, StreamOpenError, StreamScope};
pub use status::{connection_state_hint, CoreStatus, DegradedReason, SupervisionState};
pub use supervisor::{
    spawn_supervisor, BoxSleep, Clock, LoopbackPortPicker, ManualClock, MonotonicClock, PortPicker,
    RestartPolicy, Sleeper, StatusSink, SupervisorConfig, SupervisorHandle, SupervisorPanicked,
    TokioSleeper,
};

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

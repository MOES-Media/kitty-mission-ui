//! Core status model and mapping. Owner: WP09 (IC-09).
//!
//! The supervision types are defined here by WP08, because the public `StatusSink` needs them before the facade
//! exists (a recorded out-of-map edit). WP09 adds `connection_state_hint` and owns the file from then on.

use crate::contract::Mismatch;
use crate::discovery::ServiceMissing;
use crate::endpoint::ServiceEndpoint;

/// Where the supervised service is in its life.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SupervisionState {
    Starting,
    Ready { endpoint: ServiceEndpoint },
    Crashed,
    Backoff { delay: std::time::Duration },
    Stopped,
}

/// Why the service is unusable, when it is.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DegradedReason {
    None,
    ServiceMissing(ServiceMissing),
    ContractMismatch(Mismatch),
}

/// One published status. Every transition of the supervisor is one of these, in order.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CoreStatus {
    pub state: SupervisionState,
    pub degraded: DegradedReason,
    /// Starts at 1; every launch publishes a `Starting` with the next number. Generation 0 is reserved for
    /// `ServiceEndpoint::loopback`.
    pub generation: u64,
    /// The zero-based attempt of the current start: 0 for the first launch, 1 and 2 for busy-port retries.
    pub attempt: u32,
    /// True from the first `Ready` or the first `Stopped` on, and never back (FS-04).
    pub left_initial_start: bool,
}

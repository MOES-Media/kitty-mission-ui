//! Core status model and mapping. Owner: WP09 (IC-09).
//!
//! The supervision types were defined here by WP08, because the public `StatusSink` needs them before the facade
//! existed (a recorded out-of-map edit). WP09 adds `connection_state_hint` and owns the file.

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

/// The `ConnectionState` string of `packages/mission-shell/src/client/port.ts` that a status maps to, or `None` when
/// the adapter has nothing to show (FR-024; the table in `data-model.md`).
///
/// Total over the status space: a combination that cannot occur is `None`. Before the first `Ready` or `Stopped`
/// (`left_initial_start == false`) the starting, crashed and backing-off states are `connecting`; afterwards they are
/// `reconnecting`, so the port never goes back to `connecting`, not even after a host `retry()`.
pub fn connection_state_hint(status: &CoreStatus) -> Option<&'static str> {
    match (&status.state, &status.degraded) {
        (
            SupervisionState::Starting
            | SupervisionState::Crashed
            | SupervisionState::Backoff { .. },
            DegradedReason::None,
        ) => Some(if status.left_initial_start {
            "reconnecting"
        } else {
            "connecting"
        }),
        (SupervisionState::Ready { .. }, DegradedReason::None) => Some("connected"),
        (SupervisionState::Stopped, DegradedReason::ServiceMissing(_))
            if status.left_initial_start =>
        {
            Some("degraded: service-missing")
        }
        (SupervisionState::Stopped, DegradedReason::ContractMismatch(_))
            if status.left_initial_start =>
        {
            Some("degraded: contract-mismatch")
        }
        // A host stop (no reason), and every combination that cannot occur.
        _ => None,
    }
}

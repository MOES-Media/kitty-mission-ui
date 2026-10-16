//! The restart policy and the injectable time sources (FR-020, amended by A-02 and A-03).
//!
//! Two separate counters (FS-03):
//!
//! * the **crash window**: timestamps of crashes in the last `window`, used only to give up;
//! * the **consecutive-crash index**: selects the delay and resets after `reset_after_ready` of uninterrupted
//!   `Ready`. The reset never clears the window (FS2-01).

use std::collections::VecDeque;
use std::future::Future;
use std::pin::Pin;
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::{Duration, Instant};

/// A source of monotonic time. Production uses [`MonotonicClock`]; tests use [`ManualClock`].
pub trait Clock: Send + Sync {
    fn now(&self) -> Instant;
}

/// `std::time::Instant`.
#[derive(Debug, Clone, Copy, Default)]
pub struct MonotonicClock;

impl Clock for MonotonicClock {
    fn now(&self) -> Instant {
        Instant::now()
    }
}

/// A clock that moves only when told to.
#[derive(Debug)]
pub struct ManualClock {
    now: Mutex<Instant>,
}

impl ManualClock {
    pub fn new() -> Self {
        Self {
            now: Mutex::new(Instant::now()),
        }
    }

    pub fn advance(&self, by: Duration) {
        let mut now = lock(&self.now);
        *now += by;
    }
}

impl Default for ManualClock {
    fn default() -> Self {
        Self::new()
    }
}

impl Clock for ManualClock {
    fn now(&self) -> Instant {
        *lock(&self.now)
    }
}

fn lock<T>(m: &Mutex<T>) -> MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

/// What [`Sleeper::sleep`] returns (std only; no `futures` crate, A12).
pub type BoxSleep = Pin<Box<dyn Future<Output = ()> + Send + 'static>>;

/// Waits out the backoff delays. Only the backoff goes through it.
pub trait Sleeper: Send + Sync {
    fn sleep(&self, d: Duration) -> BoxSleep;
}

/// The production sleeper.
#[derive(Debug, Clone, Copy, Default)]
pub struct TokioSleeper;

impl Sleeper for TokioSleeper {
    fn sleep(&self, d: Duration) -> BoxSleep {
        Box::pin(tokio::time::sleep(d))
    }
}

/// A test sleeper: records every requested delay, advances its [`ManualClock`] by it and returns at once.
#[derive(Debug)]
pub struct RecordingSleeper {
    clock: Arc<ManualClock>,
    log: Mutex<Vec<Duration>>,
}

impl RecordingSleeper {
    pub fn new(clock: Arc<ManualClock>) -> Self {
        Self {
            clock,
            log: Mutex::new(Vec::new()),
        }
    }

    /// Every delay requested so far, in order.
    pub fn log(&self) -> Vec<Duration> {
        lock(&self.log).clone()
    }
}

impl Sleeper for RecordingSleeper {
    fn sleep(&self, d: Duration) -> BoxSleep {
        lock(&self.log).push(d);
        self.clock.advance(d);
        Box::pin(std::future::ready(()))
    }
}

/// The policy values. `Default` is the production column of plan IC-08.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RestartPolicy {
    pub delays: [Duration; 4],
    pub window: Duration,
    pub give_up_at: usize,
    pub reset_after_ready: Duration,
}

impl Default for RestartPolicy {
    fn default() -> Self {
        Self {
            delays: [
                Duration::from_millis(500),
                Duration::from_secs(1),
                Duration::from_secs(2),
                Duration::from_secs(4),
            ],
            window: Duration::from_secs(300),
            give_up_at: 5,
            reset_after_ready: Duration::from_secs(60),
        }
    }
}

/// What to do after a crash.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Decision {
    Backoff(Duration),
    GiveUp,
}

/// The two counters.
#[derive(Debug, Clone)]
pub struct PolicyState {
    policy: RestartPolicy,
    window: VecDeque<Instant>,
    index: usize,
}

impl PolicyState {
    pub fn new(policy: RestartPolicy) -> Self {
        Self {
            policy,
            window: VecDeque::new(),
            index: 0,
        }
    }

    /// Forgets all history (`retry()` from `Stopped`).
    pub fn reset(&mut self) {
        self.window.clear();
        self.index = 0;
    }

    /// The service was `Ready` for `d` before it crashed. A long enough run resets the delay index, never the window.
    pub fn on_ready_for(&mut self, d: Duration) {
        if d >= self.policy.reset_after_ready {
            self.index = 0;
        }
    }

    /// A crash (or a start failure) at `now`.
    pub fn on_crash(&mut self, now: Instant) -> Decision {
        self.window.push_back(now);
        let window = self.policy.window;
        self.window
            .retain(|at| now.saturating_duration_since(*at) <= window);
        if self.window.len() >= self.policy.give_up_at {
            return Decision::GiveUp;
        }
        let last = self.policy.delays.len() - 1;
        let delay = self.policy.delays[self.index.min(last)];
        self.index += 1;
        Decision::Backoff(delay)
    }

    /// Crashes currently in the window.
    pub fn window_len(&self) -> usize {
        self.window.len()
    }

    /// The consecutive-crash index.
    pub fn index(&self) -> usize {
        self.index
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::client::Timings;

    const LOOPS: usize = 10;

    fn secs(s: f64) -> Duration {
        Duration::from_secs_f64(s)
    }

    #[test]
    fn four_quick_crashes_back_off_then_the_fifth_gives_up() {
        for _ in 0..LOOPS {
            let clock = ManualClock::new();
            let mut state = PolicyState::new(RestartPolicy::default());
            let mut seen = Vec::new();
            for _ in 0..4 {
                seen.push(state.on_crash(clock.now()));
                clock.advance(Duration::from_secs(1));
            }
            seen.push(state.on_crash(clock.now()));
            assert_eq!(
                seen,
                vec![
                    Decision::Backoff(secs(0.5)),
                    Decision::Backoff(secs(1.0)),
                    Decision::Backoff(secs(2.0)),
                    Decision::Backoff(secs(4.0)),
                    Decision::GiveUp,
                ]
            );
        }
    }

    #[test]
    fn a_long_ready_resets_the_index_but_not_the_window() {
        for _ in 0..LOOPS {
            let clock = ManualClock::new();
            let mut state = PolicyState::new(RestartPolicy::default());
            assert_eq!(state.on_crash(clock.now()), Decision::Backoff(secs(0.5)));
            clock.advance(Duration::from_secs(70));
            state.on_ready_for(Duration::from_secs(70));
            assert_eq!(state.index(), 0, "the index was reset");
            assert_eq!(state.on_crash(clock.now()), Decision::Backoff(secs(0.5)));
            assert_eq!(state.window_len(), 2, "the window kept both crashes");
        }
    }

    #[test]
    fn a_short_ready_does_not_reset_the_index() {
        let clock = ManualClock::new();
        let mut state = PolicyState::new(RestartPolicy::default());
        assert_eq!(state.on_crash(clock.now()), Decision::Backoff(secs(0.5)));
        state.on_ready_for(Duration::from_secs(59));
        assert_eq!(state.on_crash(clock.now()), Decision::Backoff(secs(1.0)));
    }

    #[test]
    fn five_crashes_each_after_61_s_of_ready_still_give_up() {
        for _ in 0..LOOPS {
            let clock = ManualClock::new();
            let mut state = PolicyState::new(RestartPolicy::default());
            let mut seen = Vec::new();
            for _ in 0..5 {
                clock.advance(Duration::from_secs(61));
                state.on_ready_for(Duration::from_secs(61));
                seen.push(state.on_crash(clock.now()));
            }
            assert_eq!(
                seen,
                vec![
                    Decision::Backoff(secs(0.5)),
                    Decision::Backoff(secs(0.5)),
                    Decision::Backoff(secs(0.5)),
                    Decision::Backoff(secs(0.5)),
                    Decision::GiveUp,
                ],
                "every delay is 0.5 s because of the resets, yet the window reaches 5 within 300 s"
            );
        }
    }

    #[test]
    fn crashes_301_s_apart_never_give_up() {
        for _ in 0..LOOPS {
            let clock = ManualClock::new();
            let mut state = PolicyState::new(RestartPolicy::default());
            let mut gave_up = 0;
            let mut backed_off = 0;
            for _ in 0..12 {
                match state.on_crash(clock.now()) {
                    Decision::GiveUp => gave_up += 1,
                    Decision::Backoff(_) => backed_off += 1,
                }
                assert_eq!(
                    state.window_len(),
                    1,
                    "older crashes fell out of the window"
                );
                clock.advance(Duration::from_secs(301));
            }
            assert_eq!((gave_up, backed_off), (0, 12));
        }
    }

    #[test]
    fn reset_forgets_the_history() {
        let clock = ManualClock::new();
        let mut state = PolicyState::new(RestartPolicy::default());
        for _ in 0..4 {
            state.on_crash(clock.now());
        }
        state.reset();
        assert_eq!((state.window_len(), state.index()), (0, 0));
        assert_eq!(state.on_crash(clock.now()), Decision::Backoff(secs(0.5)));
    }

    #[test]
    fn defaults_equal_the_plan_values() {
        let policy = RestartPolicy::default();
        assert_eq!(policy.delays, [secs(0.5), secs(1.0), secs(2.0), secs(4.0)]);
        assert_eq!(policy.window, Duration::from_secs(300));
        assert_eq!(policy.give_up_at, 5);
        assert_eq!(policy.reset_after_ready, Duration::from_secs(60));
        let timings = Timings::default();
        assert_eq!(timings.poll_interval, Duration::from_millis(50));
        assert_eq!(timings.start_timeout, Duration::from_secs(10));
        assert_eq!(timings.stop_grace, Duration::from_secs(5));
        assert_eq!(timings.read_timeout, Duration::from_secs(30));
        assert_eq!(timings.idle_limit, Duration::from_secs(90));
    }

    #[test]
    fn the_recording_sleeper_logs_and_advances_its_clock() {
        let clock = Arc::new(ManualClock::new());
        let sleeper = RecordingSleeper::new(clock.clone());
        let before = clock.now();
        let rt = tokio::runtime::Builder::new_current_thread()
            .build()
            .expect("runtime");
        rt.block_on(sleeper.sleep(Duration::from_secs(2)));
        rt.block_on(sleeper.sleep(Duration::from_secs(3)));
        assert_eq!(
            sleeper.log(),
            vec![Duration::from_secs(2), Duration::from_secs(3)]
        );
        assert_eq!(clock.now() - before, Duration::from_secs(5));
    }
}

//! The child's captured output: a 64 KiB ring that keeps the newest bytes (NFR-004, R1-06).

use std::collections::VecDeque;
use std::sync::{Arc, Mutex, MutexGuard};

/// How much output is kept.
pub const RING_CAPACITY: usize = 64 * 1024;

/// A byte ring shared by the two drain tasks of one child.
#[derive(Debug, Default)]
pub struct OutputRing {
    bytes: Mutex<VecDeque<u8>>,
}

fn lock<T>(m: &Mutex<T>) -> MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

impl OutputRing {
    pub fn new() -> Self {
        Self::default()
    }

    /// Appends `chunk`; only the newest [`RING_CAPACITY`] bytes survive.
    pub fn push(&self, chunk: &[u8]) {
        let mut bytes = lock(&self.bytes);
        let chunk = if chunk.len() > RING_CAPACITY {
            &chunk[chunk.len() - RING_CAPACITY..]
        } else {
            chunk
        };
        bytes.extend(chunk.iter().copied());
        let excess = bytes.len().saturating_sub(RING_CAPACITY);
        bytes.drain(..excess);
    }

    pub fn snapshot(&self) -> Vec<u8> {
        lock(&self.bytes).iter().copied().collect()
    }
}

/// Points at the ring of the current or most recent child. A new child gets a new ring; the old one stays readable
/// until then.
#[derive(Debug, Default)]
pub struct OutputCapture {
    current: Mutex<Arc<OutputRing>>,
}

impl OutputCapture {
    pub fn new() -> Self {
        Self::default()
    }

    /// Starts a ring for a new child.
    pub fn begin_child(&self) -> Arc<OutputRing> {
        let ring = Arc::new(OutputRing::new());
        *lock(&self.current) = ring.clone();
        ring
    }

    pub fn snapshot(&self) -> Vec<u8> {
        lock(&self.current).snapshot()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pattern(from: usize, len: usize) -> Vec<u8> {
        (from..from + len).map(|i| (i % 251) as u8).collect()
    }

    #[test]
    fn keeps_exactly_the_newest_64_kib_after_uneven_chunks() {
        let ring = OutputRing::new();
        let sizes = [1usize, 7, 4096, 65_537, 3, 13_000, 21_000, 1];
        let mut all = Vec::new();
        for size in sizes {
            let chunk = pattern(all.len(), size);
            ring.push(&chunk);
            all.extend_from_slice(&chunk);
        }
        assert!(all.len() >= 100 * 1024, "wrote {} bytes", all.len());
        let kept = ring.snapshot();
        assert_eq!(kept.len(), 65_536);
        assert_eq!(kept, all[all.len() - 65_536..]);
    }

    #[test]
    fn a_short_write_is_kept_whole() {
        let ring = OutputRing::new();
        ring.push(b"abc");
        ring.push(b"def");
        assert_eq!(ring.snapshot(), b"abcdef");
    }

    #[test]
    fn capture_keeps_the_last_childs_ring_until_the_next_child() {
        let capture = OutputCapture::new();
        assert!(capture.snapshot().is_empty());
        let first = capture.begin_child();
        first.push(b"first");
        assert_eq!(capture.snapshot(), b"first");
        let second = capture.begin_child();
        assert!(capture.snapshot().is_empty());
        second.push(b"second");
        first.push(b" late");
        assert_eq!(capture.snapshot(), b"second");
    }
}

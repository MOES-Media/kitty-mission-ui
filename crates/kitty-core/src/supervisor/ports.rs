//! Choosing a loopback port for the service (R2-17).

use std::io;
use std::net::TcpListener;

/// Picks a port for one launch. `exclude` holds the ports already tried in the same start.
pub trait PortPicker: Send + Sync {
    fn pick(&self, exclude: &[u16]) -> io::Result<u16>;
}

/// How often a picked port may be an excluded one before the picker gives up.
const MAX_TRIES: usize = 64;

/// Calls `bind` until it returns a port that is not in `exclude`.
pub fn pick_with(mut bind: impl FnMut() -> io::Result<u16>, exclude: &[u16]) -> io::Result<u16> {
    for _ in 0..MAX_TRIES {
        let port = bind()?;
        if !exclude.contains(&port) {
            return Ok(port);
        }
    }
    Err(io::Error::new(
        io::ErrorKind::AddrNotAvailable,
        "no port outside the excluded ones was offered",
    ))
}

/// Binds `127.0.0.1:0`, reads the port and drops the listener.
#[derive(Debug, Clone, Copy, Default)]
pub struct LoopbackPortPicker;

impl PortPicker for LoopbackPortPicker {
    fn pick(&self, exclude: &[u16]) -> io::Result<u16> {
        pick_with(
            || {
                let listener = TcpListener::bind(("127.0.0.1", 0))?;
                Ok(listener.local_addr()?.port())
            },
            exclude,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn an_excluded_port_is_retried() {
        let mut offered = vec![4001u16, 4002, 4003, 4009].into_iter();
        let picked = pick_with(
            || Ok(offered.next().expect("script not exhausted")),
            &[4001, 4002, 4003],
        )
        .expect("a port is picked");
        assert_eq!(picked, 4009);
        assert_eq!(offered.next(), None, "the script was consumed exactly");
    }

    #[test]
    fn a_port_outside_the_exclusion_is_taken_at_once() {
        let mut calls = 0;
        let picked = pick_with(
            || {
                calls += 1;
                Ok(5000)
            },
            &[4001],
        )
        .expect("a port is picked");
        assert_eq!((picked, calls), (5000, 1));
    }

    #[test]
    fn a_picker_that_only_offers_excluded_ports_fails() {
        let mut calls = 0;
        let result = pick_with(
            || {
                calls += 1;
                Ok(4001)
            },
            &[4001],
        );
        assert!(result.is_err());
        assert_eq!(calls, MAX_TRIES);
    }

    #[test]
    fn the_loopback_picker_never_returns_an_excluded_port() {
        let picker = LoopbackPortPicker;
        let first = picker.pick(&[]).expect("a port");
        assert_ne!(first, 0);
        let mut tried = vec![first];
        for _ in 0..5 {
            let next = picker.pick(&tried).expect("a port");
            assert!(!tried.contains(&next));
            tried.push(next);
        }
        assert_eq!(tried.len(), 6);
    }
}

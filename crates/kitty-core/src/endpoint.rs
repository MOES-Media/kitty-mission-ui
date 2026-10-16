//! `ServiceEndpoint`: where the Mission Status service listens. Always `127.0.0.1:<port>` (FR-005, C-004).

use std::fmt;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};

/// The only address kitty-core talks to.
const LOOPBACK: Ipv4Addr = Ipv4Addr::LOCALHOST;

/// A refused endpoint address. Raised before any socket is opened.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EndpointError {
    /// The IP is not `127.0.0.1`.
    NotLoopback,
    /// The port is 0.
    ZeroPort,
}

impl fmt::Display for EndpointError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            EndpointError::NotLoopback => f.write_str("the service address must be 127.0.0.1"),
            EndpointError::ZeroPort => f.write_str("the service port must not be 0"),
        }
    }
}

impl std::error::Error for EndpointError {}

/// A loopback endpoint of the service. `generation` 0 is reserved for [`ServiceEndpoint::loopback`]; the supervisor
/// hands out generations from 1 (FS-12). An endpoint from the supervisor is valid until the next status transition.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct ServiceEndpoint {
    port: u16,
    generation: u64,
}

impl ServiceEndpoint {
    /// An endpoint for `127.0.0.1:<port>` with the reserved generation 0 (tests and lower-level use).
    pub fn loopback(port: u16) -> Self {
        Self {
            port,
            generation: 0,
        }
    }

    /// The supervisor's constructor: the endpoint of generation `generation` (which must be at least 1).
    #[allow(dead_code)] // first caller: the supervisor (WP08)
    pub(crate) fn supervised(port: u16, generation: u64) -> Self {
        debug_assert!(generation >= 1, "generation 0 is reserved for loopback()");
        Self { port, generation }
    }

    pub fn port(&self) -> u16 {
        self.port
    }

    pub fn generation(&self) -> u64 {
        self.generation
    }

    pub fn socket_addr(&self) -> SocketAddr {
        SocketAddr::new(IpAddr::V4(LOOPBACK), self.port)
    }

    /// The exact `Host` header value: `127.0.0.1:<port>`.
    pub fn host_header(&self) -> String {
        format!("{LOOPBACK}:{}", self.port)
    }
}

impl TryFrom<SocketAddr> for ServiceEndpoint {
    type Error = EndpointError;

    fn try_from(addr: SocketAddr) -> Result<Self, EndpointError> {
        match addr.ip() {
            IpAddr::V4(ip) if ip == LOOPBACK => {}
            _ => return Err(EndpointError::NotLoopback),
        }
        if addr.port() == 0 {
            return Err(EndpointError::ZeroPort);
        }
        Ok(Self::loopback(addr.port()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn addr(text: &str) -> SocketAddr {
        text.parse().expect("test address parses")
    }

    #[test]
    fn only_127_0_0_1_with_a_port_is_accepted() {
        let ok = ServiceEndpoint::try_from(addr("127.0.0.1:4173")).expect("loopback is accepted");
        assert_eq!(ok.port(), 4173);
        assert_eq!(ok.generation(), 0);
        assert_eq!(ok.host_header(), "127.0.0.1:4173");
        assert_eq!(ok.socket_addr(), addr("127.0.0.1:4173"));
    }

    #[test]
    fn every_other_address_is_refused() {
        let cases = [
            ("0.0.0.0:80", EndpointError::NotLoopback),
            ("127.0.0.2:80", EndpointError::NotLoopback),
            ("[::1]:80", EndpointError::NotLoopback),
            ("192.0.2.1:80", EndpointError::NotLoopback),
            ("127.0.0.1:0", EndpointError::ZeroPort),
        ];
        let mut ran = 0;
        for (text, expected) in cases {
            assert_eq!(
                ServiceEndpoint::try_from(addr(text)),
                Err(expected),
                "{text}"
            );
            ran += 1;
        }
        assert_eq!(ran, 5);
    }

    #[test]
    fn generation_zero_is_loopback_only() {
        assert_eq!(ServiceEndpoint::loopback(9).generation(), 0);
        assert_eq!(ServiceEndpoint::supervised(9, 1).generation(), 1);
    }
}

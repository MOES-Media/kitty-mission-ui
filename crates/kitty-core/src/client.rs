//! The contract client and its read relay (FR-002 to FR-004, NFR-004).
//!
//! One connection per call (`hyper::client::conn::http1`, no pool). Every HTTP answer is relayed as it came, with
//! its status, content type and raw body bytes; nothing is parsed, retried or interpreted (C-003).

use std::fmt;
use std::time::Duration;

use http_body_util::{BodyExt, Empty};
use hyper::body::Bytes;
use hyper::client::conn::http1::{self, SendRequest};
use hyper::http::header::{ACCEPT, CONTENT_TYPE, HOST};
use hyper::http::{HeaderValue, Request};
use hyper_util::rt::TokioIo;
use tokio::net::TcpStream;
use tokio::task::JoinHandle;

use crate::contract::Mismatch;
use crate::endpoint::ServiceEndpoint;
use crate::routes::ReadRequest;
use crate::status::CoreStatus;

/// A response body larger than this is refused (NFR-004).
pub const BODY_CAP: usize = 16 * 1024 * 1024;

/// The `Accept` header of every read (FR-004).
const READ_ACCEPT: &str = "application/json, application/problem+json";

/// Why no HTTP answer came back.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TransportFailure {
    ConnectRefused,
    Timeout,
    BodyTooLarge { limit: usize },
    Io(String),
    UnknownOperation(String),
    MissingParameter(String),
    InvalidParameter(String),
}

impl fmt::Display for TransportFailure {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TransportFailure::ConnectRefused => f.write_str("connection refused"),
            TransportFailure::Timeout => f.write_str("timed out"),
            TransportFailure::BodyTooLarge { limit } => {
                write!(f, "response body over the {limit} byte limit")
            }
            TransportFailure::Io(e) => write!(f, "I/O error: {e}"),
            TransportFailure::UnknownOperation(o) => write!(f, "unknown read operation {o}"),
            TransportFailure::MissingParameter(p) => write!(f, "missing path parameter {p}"),
            TransportFailure::InvalidParameter(p) => write!(f, "invalid parameter {p}"),
        }
    }
}

impl std::error::Error for TransportFailure {}

/// The outcome of one read. `#[non_exhaustive]`, so a `match` outside this crate needs a wildcard arm (B1). The last
/// two variants come from `Core` only; `ContractClient` never returns them.
#[derive(Debug, Clone, PartialEq, Eq)]
#[non_exhaustive]
pub enum ReadOutcome {
    /// Any HTTP answer, every status (FR-002, FR-003).
    Answer {
        status: u16,
        content_type: Option<HeaderValue>,
        body: Bytes,
    },
    /// No HTTP answer.
    Transport(TransportFailure),
    /// `Core` only: the service is not `Ready`. Nothing was sent.
    NotReady(CoreStatus),
    /// `Core` only: the service's contract does not match the pin, and the service is stopped. Nothing was sent.
    ContractMismatch(Mismatch),
}

/// The durations the client and the supervisor use. `Default` is the production column of plan IC-08.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Timings {
    pub poll_interval: Duration,
    pub start_timeout: Duration,
    pub stop_grace: Duration,
    pub read_timeout: Duration,
    pub idle_limit: Duration,
}

impl Default for Timings {
    fn default() -> Self {
        Self {
            poll_interval: Duration::from_millis(50),
            start_timeout: Duration::from_secs(10),
            stop_grace: Duration::from_secs(5),
            read_timeout: Duration::from_secs(30),
            idle_limit: Duration::from_secs(90),
        }
    }
}

/// A connected HTTP/1 sender plus the task that drives its connection. Dropping it aborts the task, unless
/// [`Connection::detach`] handed the connection over to a response body.
pub(crate) struct Connection {
    pub(crate) sender: SendRequest<Empty<Bytes>>,
    task: Option<JoinHandle<()>>,
}

impl Connection {
    /// Lets the connection task run to its natural end (the body of a forwarded response still needs it).
    pub(crate) fn detach(&mut self) {
        self.task = None;
    }
}

impl Drop for Connection {
    fn drop(&mut self) {
        if let Some(task) = self.task.take() {
            task.abort();
        }
    }
}

pub(crate) fn io_failure(e: &std::io::Error) -> TransportFailure {
    if e.kind() == std::io::ErrorKind::ConnectionRefused {
        TransportFailure::ConnectRefused
    } else {
        TransportFailure::Io(e.to_string())
    }
}

pub(crate) fn hyper_failure(e: hyper::Error) -> TransportFailure {
    TransportFailure::Io(e.to_string())
}

/// Connects to the endpoint and starts driving the connection. No deadline of its own: callers apply theirs.
pub(crate) async fn connect(endpoint: &ServiceEndpoint) -> Result<Connection, TransportFailure> {
    let stream = TcpStream::connect(endpoint.socket_addr())
        .await
        .map_err(|e| io_failure(&e))?;
    let (mut sender, driver) = http1::handshake(TokioIo::new(stream))
        .await
        .map_err(hyper_failure)?;
    let task = tokio::spawn(async move {
        // The outcome is visible to the caller through its own request; there is nobody else to tell.
        let _ = driver.await;
    });
    let connection = Connection {
        sender: {
            sender.ready().await.map_err(hyper_failure)?;
            sender
        },
        task: Some(task),
    };
    Ok(connection)
}

/// The relay for one loopback endpoint.
#[derive(Debug, Clone)]
pub struct ContractClient {
    pub(crate) endpoint: ServiceEndpoint,
    pub(crate) timings: Timings,
}

impl ContractClient {
    pub fn new(endpoint: ServiceEndpoint, timings: &Timings) -> Self {
        Self {
            endpoint,
            timings: *timings,
        }
    }

    pub fn endpoint(&self) -> ServiceEndpoint {
        self.endpoint
    }

    /// Relays one read. The whole sequence (connect, head, body) runs under one total deadline, `read_timeout`.
    pub async fn read(&self, req: &ReadRequest<'_>) -> ReadOutcome {
        let target = match req.target() {
            Ok(target) => target,
            Err(failure) => return ReadOutcome::Transport(failure),
        };
        match tokio::time::timeout(self.timings.read_timeout, self.relay(&target)).await {
            Ok(Ok(answer)) => answer,
            Ok(Err(failure)) => ReadOutcome::Transport(failure),
            Err(_) => ReadOutcome::Transport(TransportFailure::Timeout),
        }
    }

    async fn relay(&self, target: &str) -> Result<ReadOutcome, TransportFailure> {
        let mut request = Request::builder()
            .method("GET")
            .uri(target)
            .body(Empty::<Bytes>::new())
            .map_err(|e| TransportFailure::Io(e.to_string()))?;
        let host = HeaderValue::from_str(&self.endpoint.host_header())
            .map_err(|e| TransportFailure::Io(e.to_string()))?;
        request.headers_mut().insert(HOST, host);
        request
            .headers_mut()
            .insert(ACCEPT, HeaderValue::from_static(READ_ACCEPT));
        let mut connection = connect(&self.endpoint).await?;
        let response = connection
            .sender
            .send_request(request)
            .await
            .map_err(hyper_failure)?;
        let status = response.status().as_u16();
        let content_type = response.headers().get(CONTENT_TYPE).cloned();
        let mut body = response.into_body();
        let mut bytes: Vec<u8> = Vec::new();
        while let Some(frame) = body.frame().await {
            let frame = frame.map_err(hyper_failure)?;
            if let Some(data) = frame.data_ref() {
                if bytes.len() + data.len() > BODY_CAP {
                    return Err(TransportFailure::BodyTooLarge { limit: BODY_CAP });
                }
                bytes.extend_from_slice(data);
            }
        }
        Ok(ReadOutcome::Answer {
            status,
            content_type,
            body: Bytes::from(bytes),
        })
    }
}

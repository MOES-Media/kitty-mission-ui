//! The change stream (IC-05): `GET /api/v1/events` relayed as raw changes, in order (FR-007 to FR-010).
//!
//! [`FrameReader`] is a pure, byte-fed SSE parser. [`ChangeStream`] owns one connection and one reader, and yields
//! [`StreamEvent`]s: any number of changes and diagnostics, then at most one terminal item, then `None` forever.
//! Nothing is interpreted, reconnected or remembered here: reconnect, cursor bookkeeping and `resync` belong to the
//! adapters (C-003).

use std::collections::VecDeque;
use std::fmt;
use std::time::Duration;

use http_body_util::{BodyExt, Empty};
use hyper::body::{Bytes, Incoming};
use hyper::http::header::{ACCEPT, CONTENT_TYPE, HOST};
use hyper::http::{HeaderValue, Request, Response};
use percent_encoding::{utf8_percent_encode, AsciiSet, NON_ALPHANUMERIC};
use serde::de::IgnoredAny;
use tokio::time::{timeout_at, Instant};

use crate::client::{
    connect, hyper_failure, Connection, ContractClient, TransportFailure, BODY_CAP,
};
use crate::contract::Mismatch;
use crate::routes::{entry, API_PREFIX};
use crate::status::CoreStatus;

/// The most bytes one frame may span, counted from the last event boundary (FS-13).
pub const FRAME_CAP: usize = 1024 * 1024;

/// The `Accept` header of the stream request.
const STREAM_ACCEPT: &str = "text/event-stream";

/// The event names the service emits. Any other name is a diagnostic.
const KNOWN_EVENTS: [&str; 3] = ["status-transition", "mission-lifecycle", "log-truncated"];

/// Query names and values are encoded as in [`crate::routes`]: everything but `ALPHA`, `DIGIT`, `-`, `.`, `_`, `~`.
const ENCODE: &AsciiSet = &NON_ALPHANUMERIC
    .remove(b'-')
    .remove(b'.')
    .remove(b'_')
    .remove(b'~');

const BOM: [u8; 3] = [0xEF, 0xBB, 0xBF];

// ---- The frame reader -------------------------------------------------------------------------------------------

/// What the `id:` lines of one frame said.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum IdField {
    /// No usable `id:` line.
    Unset,
    /// The last `id:` line was empty: the cursor is cleared.
    Clear,
    Value(String),
}

/// One dispatched frame: it had at least one `data` line.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Frame {
    /// `None` when there was no `event:` line or its value was empty.
    pub event: Option<String>,
    pub id: IdField,
    /// All `data` lines joined with `\n`; valid UTF-8.
    pub data: Vec<u8>,
}

/// Why a byte stream is not an SSE stream this reader accepts.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FrameError {
    /// More than [`FRAME_CAP`] bytes since the last event boundary.
    TooLarge,
    /// A line that is not valid UTF-8.
    Malformed,
}

/// A byte-fed SSE parser with no I/O. Feeding the same bytes whole or one by one gives the same frames and the same
/// error. After an error the reader stays failed.
#[derive(Debug)]
pub struct FrameReader {
    /// A BOM is honoured only at the very start; until the start is settled, matched BOM bytes are held back.
    start_open: bool,
    held: usize,
    line: Vec<u8>,
    since_boundary: usize,
    after_cr: bool,
    event: Option<String>,
    id: IdField,
    data: Vec<u8>,
    has_data: bool,
    failed: Option<FrameError>,
}

impl Default for FrameReader {
    fn default() -> Self {
        Self::new()
    }
}

impl FrameReader {
    pub fn new() -> Self {
        Self {
            start_open: true,
            held: 0,
            line: Vec::new(),
            since_boundary: 0,
            after_cr: false,
            event: None,
            id: IdField::Unset,
            data: Vec::new(),
            has_data: false,
            failed: None,
        }
    }

    /// Feeds `bytes`. On an error, the frames that completed before it are lost; use [`FrameReader::feed_partial`] to
    /// keep them.
    pub fn feed(&mut self, bytes: &[u8]) -> Result<Vec<Frame>, FrameError> {
        let mut frames = Vec::new();
        self.feed_partial(bytes, &mut frames)?;
        Ok(frames)
    }

    /// Feeds `bytes`; every frame completed so far is appended to `out`, also when an error follows.
    pub fn feed_partial(&mut self, bytes: &[u8], out: &mut Vec<Frame>) -> Result<(), FrameError> {
        if let Some(error) = self.failed {
            return Err(error);
        }
        for &byte in bytes {
            if let Err(error) = self.push(byte, out) {
                self.failed = Some(error);
                return Err(error);
            }
        }
        Ok(())
    }

    fn push(&mut self, byte: u8, out: &mut Vec<Frame>) -> Result<(), FrameError> {
        if self.after_cr && byte == b'\n' {
            // The LF of a CRLF pair belongs to the line ending already counted at the CR (CON-001).
            self.after_cr = false;
            return Ok(());
        }
        self.since_boundary += 1;
        if self.since_boundary > FRAME_CAP {
            return Err(FrameError::TooLarge);
        }
        if self.start_open {
            if byte == BOM[self.held] {
                self.held += 1;
                if self.held == BOM.len() {
                    self.start_open = false;
                    self.held = 0;
                }
                return Ok(());
            }
            self.start_open = false;
            let held = std::mem::take(&mut self.held);
            for &kept in &BOM[..held] {
                self.consume(kept, out)?;
            }
        }
        self.consume(byte, out)
    }

    fn consume(&mut self, byte: u8, out: &mut Vec<Frame>) -> Result<(), FrameError> {
        if std::mem::take(&mut self.after_cr) && byte == b'\n' {
            return Ok(());
        }
        match byte {
            b'\n' => self.end_line(out),
            b'\r' => {
                self.after_cr = true;
                self.end_line(out)
            }
            other => {
                self.line.push(other);
                Ok(())
            }
        }
    }

    fn end_line(&mut self, out: &mut Vec<Frame>) -> Result<(), FrameError> {
        let line = std::mem::take(&mut self.line);
        if line.is_empty() {
            self.since_boundary = 0;
            self.dispatch(out);
            return Ok(());
        }
        let text = std::str::from_utf8(&line).map_err(|_| FrameError::Malformed)?;
        if text.starts_with(':') {
            return Ok(());
        }
        let (field, value) = match text.split_once(':') {
            Some((field, value)) => (field, value.strip_prefix(' ').unwrap_or(value)),
            None => (text, ""),
        };
        match field {
            "event" => self.event = (!value.is_empty()).then(|| value.to_owned()),
            "data" => {
                if self.has_data {
                    self.data.push(b'\n');
                }
                self.data.extend_from_slice(value.as_bytes());
                self.has_data = true;
            }
            "id" if value.contains('\0') => {}
            "id" if value.is_empty() => self.id = IdField::Clear,
            "id" => self.id = IdField::Value(value.to_owned()),
            // `retry` and unknown fields are ignored.
            _ => {}
        }
        Ok(())
    }

    fn dispatch(&mut self, out: &mut Vec<Frame>) {
        let event = self.event.take();
        let id = std::mem::replace(&mut self.id, IdField::Unset);
        let data = std::mem::take(&mut self.data);
        if std::mem::take(&mut self.has_data) {
            out.push(Frame { event, id, data });
        }
    }
}

// ---- Types of the stream ----------------------------------------------------------------------------------------

/// What to stream.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StreamScope {
    /// Every mission, with no cursors.
    All,
    /// One mission, resumed after `cursor` when given. The cursor is sent as `streamCursor`.
    Mission {
        mission_id: String,
        cursor: Option<String>,
    },
}

/// Why `open_stream` refused before any I/O. `#[non_exhaustive]`, so a `match` outside this crate needs a wildcard
/// arm (B1). The last two variants come from `Core` only; `ContractClient` never returns them.
#[derive(Debug, Clone, PartialEq, Eq)]
#[non_exhaustive]
pub enum StreamOpenError {
    /// A cursor came with an empty mission id.
    CursorWithoutMission,
    /// A mission scope with an empty mission id and no cursor.
    EmptyMission,
    /// `Core` only: the service is not `Ready`. Nothing was sent.
    NotReady(CoreStatus),
    /// `Core` only: the service's contract does not match the pin, and the service is stopped. Nothing was sent.
    ContractMismatch(Mismatch),
}

impl fmt::Display for StreamOpenError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            StreamOpenError::CursorWithoutMission => {
                f.write_str("a stream cursor needs a mission id")
            }
            StreamOpenError::EmptyMission => f.write_str("the mission id is empty"),
            StreamOpenError::NotReady(_) => f.write_str("the service is not ready"),
            StreamOpenError::ContractMismatch(_) => {
                f.write_str("the service's contract does not match the pinned one")
            }
        }
    }
}

impl std::error::Error for StreamOpenError {}

/// One change as the service sent it: nothing parsed, nothing dropped.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RawChange {
    /// One of `status-transition`, `mission-lifecycle`, `log-truncated`.
    pub event: String,
    /// The value of the frame's `id:` line, when it had a usable one.
    pub cursor: Option<String>,
    /// The joined `data` bytes, unchanged; one JSON value.
    pub data: Bytes,
}

/// A note about the stream itself, not a change.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StreamDiagnostic {
    UnknownEvent { event: String },
}

/// Why the stream is over, when it did not end with a declared refusal.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum UnavailableReason {
    /// An answer that is not a stream and not a declared refusal, or a 200 that is not `text/event-stream`.
    Status,
    ConnectRefused,
    /// A clean end of stream, or a reset.
    Dropped,
    /// No byte within `limit`.
    Idle {
        limit: Duration,
    },
    MalformedFrame,
    MalformedData,
    FrameTooLarge {
        limit: usize,
    },
    /// A terminal body over the cap (FS2-04).
    BodyTooLarge {
        limit: usize,
    },
    /// No answer head, or a terminal body still incomplete, at `read_timeout` (FS2-04).
    Timeout,
}

/// One item of a [`ChangeStream`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StreamEvent {
    Change(RawChange),
    Diagnostic(StreamDiagnostic),
    /// Terminal: a refusal declared for `streamEvents` in `routes.json`, before any event (FR-009).
    Refused {
        status: u16,
        content_type: Option<HeaderValue>,
        body: Bytes,
    },
    /// Terminal (FR-010). `status` is the HTTP status of the answer, when there was one that was not a stream.
    Unavailable {
        reason: UnavailableReason,
        status: Option<u16>,
        body: Option<Bytes>,
    },
}

fn unavailable(reason: UnavailableReason) -> StreamEvent {
    StreamEvent::Unavailable {
        reason,
        status: None,
        body: None,
    }
}

/// The live part of a stream: it exists only until the terminal item is queued.
struct Live {
    // Dropping the connection aborts its driver task.
    _connection: Connection,
    body: Incoming,
    reader: FrameReader,
    last_byte: Instant,
    idle_limit: Duration,
}

/// The change stream. Cancel-safe: the parser and the queued items live here, so dropping a `next()` future loses no
/// byte. Dropping the stream closes the connection.
pub struct ChangeStream {
    queue: VecDeque<StreamEvent>,
    live: Option<Live>,
}

impl fmt::Debug for ChangeStream {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("ChangeStream")
            .field("queued", &self.queue.len())
            .field("live", &self.live.is_some())
            .finish()
    }
}

impl ChangeStream {
    fn ended(terminal: StreamEvent) -> Self {
        Self {
            queue: VecDeque::from([terminal]),
            live: None,
        }
    }

    /// The next item, or `None` once the terminal item was delivered.
    pub async fn next(&mut self) -> Option<StreamEvent> {
        loop {
            if let Some(item) = self.queue.pop_front() {
                return Some(item);
            }
            let live = self.live.as_mut()?;
            let deadline = live.last_byte + live.idle_limit;
            let terminal = match timeout_at(deadline, live.body.frame()).await {
                Err(_) => Some(unavailable(UnavailableReason::Idle {
                    limit: live.idle_limit,
                })),
                Ok(None) | Ok(Some(Err(_))) => Some(unavailable(UnavailableReason::Dropped)),
                Ok(Some(Ok(frame))) => match frame.into_data() {
                    Ok(chunk) if !chunk.is_empty() => {
                        live.last_byte = Instant::now();
                        absorb(&mut live.reader, &chunk, &mut self.queue)
                    }
                    // Trailers and empty chunks carry no byte of the stream.
                    _ => None,
                },
            };
            if let Some(terminal) = terminal {
                self.queue.push_back(terminal);
                self.live = None;
            }
        }
    }
}

/// Feeds a chunk and queues what it completed. The returned item, when any, ends the stream.
fn absorb(
    reader: &mut FrameReader,
    chunk: &[u8],
    queue: &mut VecDeque<StreamEvent>,
) -> Option<StreamEvent> {
    let mut frames = Vec::new();
    let fed = reader.feed_partial(chunk, &mut frames);
    for frame in frames {
        match relay(frame) {
            Ok(item) => queue.push_back(item),
            Err(terminal) => return Some(terminal),
        }
    }
    match fed {
        Ok(()) => None,
        Err(FrameError::TooLarge) => Some(unavailable(UnavailableReason::FrameTooLarge {
            limit: FRAME_CAP,
        })),
        Err(FrameError::Malformed) => Some(unavailable(UnavailableReason::MalformedFrame)),
    }
}

/// One frame as an item. A known event whose data is not exactly one JSON value ends the stream.
fn relay(frame: Frame) -> Result<StreamEvent, StreamEvent> {
    // An event without a name is the SSE default, "message".
    let event = frame.event.unwrap_or_else(|| "message".to_owned());
    if !KNOWN_EVENTS.contains(&event.as_str()) {
        return Ok(StreamEvent::Diagnostic(StreamDiagnostic::UnknownEvent {
            event,
        }));
    }
    if serde_json::from_slice::<IgnoredAny>(&frame.data).is_err() {
        return Err(unavailable(UnavailableReason::MalformedData));
    }
    let cursor = match frame.id {
        IdField::Value(id) => Some(id),
        IdField::Unset | IdField::Clear => None,
    };
    Ok(StreamEvent::Change(RawChange {
        event,
        cursor,
        data: Bytes::from(frame.data),
    }))
}

// ---- Opening ----------------------------------------------------------------------------------------------------

fn stream_target(scope: &StreamScope) -> Result<String, StreamOpenError> {
    let path = entry("streamEvents").map_or("/events", |e| e.path_template.as_str());
    let mut target = format!("{API_PREFIX}{path}");
    if let StreamScope::Mission { mission_id, cursor } = scope {
        if mission_id.is_empty() {
            return Err(if cursor.is_some() {
                StreamOpenError::CursorWithoutMission
            } else {
                StreamOpenError::EmptyMission
            });
        }
        target.push_str("?missionId=");
        target.extend(utf8_percent_encode(mission_id, ENCODE));
        if let Some(cursor) = cursor {
            target.push_str("&streamCursor=");
            target.extend(utf8_percent_encode(cursor, ENCODE));
        }
    }
    Ok(target)
}

fn is_event_stream(content_type: &HeaderValue) -> bool {
    content_type.to_str().is_ok_and(|text| {
        text.split(';')
            .next()
            .is_some_and(|media| media.trim().eq_ignore_ascii_case(STREAM_ACCEPT))
    })
}

/// Whether `streamEvents` declares `status` as a refusal in the embedded route table.
fn is_declared_refusal(status: u16) -> bool {
    entry("streamEvents").is_some_and(|e| e.refusals.values().any(|s| s.contains(&status)))
}

fn reason_of(failure: &TransportFailure) -> UnavailableReason {
    match failure {
        TransportFailure::ConnectRefused => UnavailableReason::ConnectRefused,
        TransportFailure::Timeout => UnavailableReason::Timeout,
        _ => UnavailableReason::Dropped,
    }
}

/// Reads a terminal body under the 16 MiB cap and `deadline`.
async fn read_terminal_body(
    mut body: Incoming,
    deadline: Instant,
) -> Result<Bytes, UnavailableReason> {
    let mut bytes: Vec<u8> = Vec::new();
    loop {
        match timeout_at(deadline, body.frame()).await {
            Err(_) => return Err(UnavailableReason::Timeout),
            Ok(None) => return Ok(Bytes::from(bytes)),
            Ok(Some(Err(_))) => return Err(UnavailableReason::Dropped),
            Ok(Some(Ok(frame))) => {
                if let Some(data) = frame.data_ref() {
                    if bytes.len() + data.len() > BODY_CAP {
                        return Err(UnavailableReason::BodyTooLarge { limit: BODY_CAP });
                    }
                    bytes.extend_from_slice(data);
                }
            }
        }
    }
}

impl ContractClient {
    /// Opens the change stream. Invalid scopes are refused before any I/O. Everything else, including a refused
    /// connection, is the first item of the returned stream. `read_timeout` bounds connecting, the answer head and a
    /// terminal body; a live stream is bounded only by `idle_limit`.
    pub async fn open_stream(&self, scope: StreamScope) -> Result<ChangeStream, StreamOpenError> {
        let target = stream_target(&scope)?;
        Ok(self.open(&target).await)
    }

    async fn open(&self, target: &str) -> ChangeStream {
        let deadline = Instant::now() + self.timings.read_timeout;
        let (connection, response) =
            match timeout_at(deadline, self.send_stream_request(target)).await {
                Ok(Ok(pair)) => pair,
                Ok(Err(failure)) => return ChangeStream::ended(unavailable(reason_of(&failure))),
                Err(_) => return ChangeStream::ended(unavailable(UnavailableReason::Timeout)),
            };
        let status = response.status().as_u16();
        let content_type = response.headers().get(CONTENT_TYPE).cloned();
        let body = response.into_body();
        if status == 200 && content_type.as_ref().is_some_and(is_event_stream) {
            return ChangeStream {
                queue: VecDeque::new(),
                live: Some(Live {
                    _connection: connection,
                    body,
                    reader: FrameReader::new(),
                    last_byte: Instant::now(),
                    idle_limit: self.timings.idle_limit,
                }),
            };
        }
        let terminal = match read_terminal_body(body, deadline).await {
            Err(reason) => StreamEvent::Unavailable {
                reason,
                status: Some(status),
                body: None,
            },
            Ok(body) if is_declared_refusal(status) => StreamEvent::Refused {
                status,
                content_type,
                body,
            },
            Ok(body) => StreamEvent::Unavailable {
                reason: UnavailableReason::Status,
                status: Some(status),
                body: Some(body),
            },
        };
        ChangeStream::ended(terminal)
    }

    /// Exactly `Host` and `Accept`; never a `Last-Event-ID` (FR-004, FR-008).
    async fn send_stream_request(
        &self,
        target: &str,
    ) -> Result<(Connection, Response<Incoming>), TransportFailure> {
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
            .insert(ACCEPT, HeaderValue::from_static(STREAM_ACCEPT));
        let mut connection = connect(&self.endpoint).await?;
        let response = connection
            .sender
            .send_request(request)
            .await
            .map_err(hyper_failure)?;
        Ok((connection, response))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A stream is movable to a task: `Send + 'static` (R2-13).
    #[test]
    fn change_stream_is_send_and_static() {
        fn assert_send_static<T: Send + 'static>() {}
        assert_send_static::<ChangeStream>();
    }

    /// How an input is cut into feeds.
    enum Cut<'a> {
        Whole,
        Bytes,
        At(&'a [usize]),
    }

    fn run(input: &[u8], cut: &Cut<'_>) -> (Vec<Frame>, Option<FrameError>) {
        let mut reader = FrameReader::new();
        let mut frames = Vec::new();
        let mut error = None;
        let pieces: Vec<&[u8]> = match cut {
            Cut::Whole => vec![input],
            Cut::Bytes => input.chunks(1).collect(),
            Cut::At(points) => {
                let mut pieces = Vec::new();
                let mut from = 0;
                for &at in points.iter() {
                    pieces.push(&input[from..at]);
                    from = at;
                }
                pieces.push(&input[from..]);
                pieces
            }
        };
        for piece in pieces {
            if let Err(e) = reader.feed_partial(piece, &mut frames) {
                error = Some(e);
                break;
            }
        }
        (frames, error)
    }

    /// Feeds `input` whole and byte by byte, asserts both agree, and returns the common result.
    fn both(input: &[u8]) -> (Vec<Frame>, Option<FrameError>) {
        let whole = run(input, &Cut::Whole);
        let bytes = run(input, &Cut::Bytes);
        assert_eq!(whole, bytes, "whole and byte-by-byte feeding must agree");
        whole
    }

    fn frame(event: Option<&str>, id: IdField, data: &str) -> Frame {
        Frame {
            event: event.map(str::to_owned),
            id,
            data: data.as_bytes().to_vec(),
        }
    }

    #[test]
    fn a_plain_frame() {
        let (frames, error) = both(b"event: status-transition\nid: 7:ab\ndata: {}\n\n");
        assert_eq!(error, None);
        assert_eq!(
            frames,
            vec![frame(
                Some("status-transition"),
                IdField::Value("7:ab".into()),
                "{}"
            )]
        );
    }

    #[test]
    fn every_line_ending_and_a_crlf_split_across_feeds() {
        let mut ran = 0;
        for text in [
            "data: 1\n\n",
            "data: 1\r\n\r\n",
            "data: 1\r\r",
            "data: 1\n\r\n",
            "data: 1\r\n\n",
        ] {
            let (frames, error) = both(text.as_bytes());
            assert_eq!(
                (frames, error),
                (vec![frame(None, IdField::Unset, "1")], None)
            );
            ran += 1;
        }
        assert_eq!(ran, 5);
        // The CRLF is cut between the CR and the LF, at every such point of the input.
        let input = b"data: 1\r\n\r\ndata: 2\r\n\r\n";
        let mut cuts = 0;
        for (at, byte) in input.iter().enumerate() {
            if *byte == b'\r' {
                let (frames, error) = run(input, &Cut::At(&[at + 1]));
                assert_eq!(error, None);
                assert_eq!(frames.len(), 2, "cut after the CR at {at}");
                cuts += 1;
            }
        }
        assert_eq!(cuts, 4);
    }

    #[test]
    fn a_bom_is_honoured_only_at_the_start_also_when_split() {
        let mut ran = 0;
        let input = b"\xEF\xBB\xBFdata: 1\n\n";
        let expected = (vec![frame(None, IdField::Unset, "1")], None);
        assert_eq!(both(input), expected);
        for at in [1, 2] {
            assert_eq!(run(input, &Cut::At(&[at])), expected, "cut at {at}");
            ran += 1;
        }
        assert_eq!(run(input, &Cut::At(&[1, 2])), expected);
        assert_eq!(ran, 2);
        // A second BOM is part of its line: that line names no known field, so the second frame has no data.
        let (frames, error) = both(b"\xEF\xBB\xBFdata: 1\n\n\xEF\xBB\xBFdata: 2\n\n");
        assert_eq!(error, None);
        assert_eq!(frames.len(), 1);
        // A partial BOM is replayed into the line (and a lone 0xEF is not UTF-8).
        assert_eq!(
            both(b"\xEFdata: 1\n\n"),
            (vec![], Some(FrameError::Malformed))
        );
        assert_eq!(
            both(b"\xEF\xBBdata: 1\n\n"),
            (vec![], Some(FrameError::Malformed))
        );
        // Positive control: no BOM at all.
        assert_eq!(both(b"data: 1\n\n"), expected);
    }

    #[test]
    fn a_line_of_1_mib_plus_one_without_a_newline_is_too_large() {
        let mut over = b"data: ".to_vec();
        over.resize(FRAME_CAP + 1, b'a');
        assert_eq!(both(&over), (vec![], Some(FrameError::TooLarge)));
        // Positive control: exactly the cap is still fine (no error, nothing dispatched yet).
        over.truncate(FRAME_CAP);
        assert_eq!(both(&over), (vec![], None));
    }

    #[test]
    fn a_frame_of_exactly_the_cap_parses_after_either_line_ending() {
        // CON-001: the LF swallowed after a CR must not count against the next frame.
        for ending in [&b"\n\n"[..], &b"\r\n\r\n"[..], &b"\r\r"[..]] {
            let mut input = b"data: x".to_vec();
            input.extend_from_slice(ending);
            let mut body = b"data: ".to_vec();
            // The line plus its two terminating CR or LF bytes make exactly FRAME_CAP counted bytes in every case
            // (an LF that follows a CR is swallowed and never counted).
            body.resize(FRAME_CAP - 2, b'a');
            input.extend_from_slice(&body);
            input.extend_from_slice(ending);
            let (frames, error) = both(&input);
            assert_eq!(error, None, "ending {ending:?}");
            assert_eq!(frames.len(), 2, "ending {ending:?}");
        }
    }

    #[test]
    fn the_cap_counts_from_the_last_event_boundary_and_includes_comments() {
        // 100,000 heartbeat frames are more than 1 MiB in total and must not trip the cap.
        let heartbeat = b": heartbeat\n\n";
        let many: Vec<u8> = heartbeat.repeat(100_000);
        assert!(many.len() > FRAME_CAP);
        assert_eq!(both(&many), (vec![], None));
        // The same bytes without the blank lines are one long run of comment lines: over the cap.
        let run_of_comments: Vec<u8> = b": heartbeat\n".repeat(100_000);
        assert!(run_of_comments.len() > FRAME_CAP);
        assert_eq!(both(&run_of_comments), (vec![], Some(FrameError::TooLarge)));
        // Dispatched frames reset the count as well: three 500 KiB frames pass.
        let mut big = Vec::new();
        for _ in 0..3 {
            big.extend_from_slice(b"data: ");
            big.resize(big.len() + 500 * 1024, b'x');
            big.extend_from_slice(b"\n\n");
        }
        let (frames, error) = both(&big);
        assert_eq!((frames.len(), error), (3, None));
    }

    #[test]
    fn the_cap_check_comes_before_the_utf8_check() {
        let mut input = b"data: \xFF\n".to_vec();
        assert_eq!(both(&input), (vec![], Some(FrameError::Malformed)));
        input.resize(FRAME_CAP + 1, b'a');
        // The bad line ended long before the cap, so it is reported as malformed, in both feeding modes.
        assert_eq!(both(&input), (vec![], Some(FrameError::Malformed)));
        // A long pending line is too large before it could be checked at all.
        let mut long = b"data: \xFF".to_vec();
        long.resize(FRAME_CAP + 1, b'a');
        assert_eq!(both(&long), (vec![], Some(FrameError::TooLarge)));
    }

    #[test]
    fn bare_data_and_several_data_lines() {
        assert_eq!(
            both(b"data\n\n"),
            (vec![frame(None, IdField::Unset, "")], None)
        );
        assert_eq!(
            both(b"data:\n\n"),
            (vec![frame(None, IdField::Unset, "")], None)
        );
        assert_eq!(
            both(b"data: a\ndata\ndata:  b\n\n"),
            (vec![frame(None, IdField::Unset, "a\n\n b")], None)
        );
        // Only one space is stripped; no space is fine too.
        assert_eq!(
            both(b"data:x\n\n"),
            (vec![frame(None, IdField::Unset, "x")], None)
        );
    }

    #[test]
    fn id_lines() {
        let id = |s: &str| IdField::Value(s.to_owned());
        // The last id wins.
        assert_eq!(
            both(b"id: 1\nid: 2\ndata: x\n\n"),
            (vec![frame(None, id("2"), "x")], None)
        );
        // An empty id clears, also after a set one.
        assert_eq!(
            both(b"id: 1\nid:\ndata: x\n\n"),
            (vec![frame(None, IdField::Clear, "x")], None)
        );
        // An id with a NUL is ignored: it keeps an earlier one, and sets nothing alone.
        assert_eq!(
            both(b"id: 1\nid: 2\0\ndata: x\n\n"),
            (vec![frame(None, id("1"), "x")], None)
        );
        assert_eq!(
            both(b"id: a\0b\ndata: x\n\n"),
            (vec![frame(None, IdField::Unset, "x")], None)
        );
        // The id belongs to its own frame only.
        assert_eq!(
            both(b"id: 1\ndata: x\n\ndata: y\n\n"),
            (
                vec![frame(None, id("1"), "x"), frame(None, IdField::Unset, "y")],
                None
            )
        );
    }

    #[test]
    fn retry_unknown_fields_and_comments_are_ignored_and_blank_lines_without_data_dispatch_nothing()
    {
        assert_eq!(
            both(b"retry: 10\nfoo: bar\n: comment\nevent: e\ndata: x\n\n"),
            (vec![frame(Some("e"), IdField::Unset, "x")], None)
        );
        // A frame without data dispatches nothing and does not leak its event or id into the next frame.
        assert_eq!(
            both(b"event: lost\nid: 9\n\ndata: x\n\n\n\n"),
            (vec![frame(None, IdField::Unset, "x")], None)
        );
        // An empty event value means no event name.
        assert_eq!(
            both(b"event:\ndata: x\n\n"),
            (vec![frame(None, IdField::Unset, "x")], None)
        );
    }

    #[test]
    fn invalid_utf8_is_malformed_but_frames_before_it_are_kept_by_feed_partial() {
        assert_eq!(
            both(b"data: \xC3\x28\n\n"),
            (vec![], Some(FrameError::Malformed))
        );
        assert_eq!(
            both(b"data: ok\n\ndata: \xFF\n\ndata: later\n\n"),
            (
                vec![frame(None, IdField::Unset, "ok")],
                Some(FrameError::Malformed)
            )
        );
        // Positive control: valid multi-byte UTF-8 passes.
        assert_eq!(
            both("data: é€\n\n".as_bytes()),
            (vec![frame(None, IdField::Unset, "é€")], None)
        );
        // `feed` drops the frames before the error; the reader then stays failed.
        let mut reader = FrameReader::new();
        assert_eq!(
            reader.feed(b"data: ok\n\ndata: \xFF\n\n"),
            Err(FrameError::Malformed)
        );
        assert_eq!(reader.feed(b"data: more\n\n"), Err(FrameError::Malformed));
    }

    #[test]
    fn stream_target_encodes_and_refuses_before_io() {
        let scope = |id: &str, cursor: Option<&str>| StreamScope::Mission {
            mission_id: id.to_owned(),
            cursor: cursor.map(str::to_owned),
        };
        assert_eq!(
            stream_target(&StreamScope::All).as_deref(),
            Ok("/api/v1/events")
        );
        assert_eq!(
            stream_target(&scope("M 1", Some("7:ab"))).as_deref(),
            Ok("/api/v1/events?missionId=M%201&streamCursor=7%3Aab")
        );
        assert_eq!(
            stream_target(&scope("", Some("7:ab"))),
            Err(StreamOpenError::CursorWithoutMission)
        );
        assert_eq!(
            stream_target(&scope("", None)),
            Err(StreamOpenError::EmptyMission)
        );
    }
}

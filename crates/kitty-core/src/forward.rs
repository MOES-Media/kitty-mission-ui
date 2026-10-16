//! `forward()`: the pass-through for #21's proxy (R3-07, R4-03, FS-08).

use http_body_util::Empty;
use hyper::body::Incoming;
use hyper::http::header::{ACCEPT, HOST};
use hyper::http::{HeaderMap, HeaderValue, Request, Response};

use crate::client::{connect, ContractClient, TransportFailure};
use crate::endpoint::ServiceEndpoint;
use crate::routes::API_PREFIX;

/// Exactly `Host: 127.0.0.1:<port>` and the caller's `Accept`; nothing else is ever sent upstream (FR-004).
pub fn upstream_request_headers(endpoint: &ServiceEndpoint, accept: HeaderValue) -> HeaderMap {
    let mut headers = HeaderMap::new();
    // The host header is built from a `u16`: always a valid header value.
    if let Ok(host) = HeaderValue::from_str(&endpoint.host_header()) {
        headers.insert(HOST, host);
    }
    headers.insert(ACCEPT, accept);
    headers
}

impl ContractClient {
    /// Relays one `GET` of `path_and_query` (which must start with `/api/v1/`) and returns the response as soon as its
    /// head arrives. `read_timeout` bounds connecting and the response head only: the body is the caller's, with no
    /// cap and no deadline from kitty-core (FS-08).
    pub async fn forward(
        &self,
        path_and_query: &str,
        accept: HeaderValue,
    ) -> Result<Response<Incoming>, TransportFailure> {
        let prefix = format!("{API_PREFIX}/");
        if !path_and_query.starts_with(&prefix) {
            return Err(TransportFailure::InvalidParameter(
                "path_and_query".to_owned(),
            ));
        }
        let mut request = Request::builder()
            .method("GET")
            .uri(path_and_query)
            .body(Empty::<hyper::body::Bytes>::new())
            .map_err(|_| TransportFailure::InvalidParameter("path_and_query".to_owned()))?;
        *request.headers_mut() = upstream_request_headers(&self.endpoint, accept);
        let head = async {
            let mut connection = connect(&self.endpoint).await?;
            // The connection task must outlive this call: the caller reads the body from it.
            let response = connection.sender.send_request(request).await;
            let response = response.map_err(crate::client::hyper_failure)?;
            connection.detach();
            Ok(response)
        };
        match tokio::time::timeout(self.timings.read_timeout, head).await {
            Ok(result) => result,
            Err(_) => Err(TransportFailure::Timeout),
        }
    }
}

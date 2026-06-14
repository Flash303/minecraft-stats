use std::{net::SocketAddr, time::Instant};
use axum::{Extension, body::{Body, HttpBody}, extract::{ConnectInfo, Request}, middleware::Next, response::Response};

use crate::{services::{clerk::model::ClerkClaims, statistics::loki::send_to_loki}, utils::real_ip::get_client_ip};

pub async fn stats_middleware(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Extension(user): Extension<Option<ClerkClaims>>,
    request: Request<Body>,
    next: Next,
) -> Response {
    let start_time = Instant::now();

    let method = request.method().to_string();
    let route = request.uri().path().to_string();

    let ip = get_client_ip(request.headers(), &addr);

    // Request size
    let request_headers_size: usize = request.headers().iter().map(|(k, v)| k.as_str().len() + v.len()).sum();
    let request_body_size = request.body().size_hint().lower();
    let total_request_size = (request_headers_size as u64) + request_body_size;

    let user_id = user
        .map(|u| Some(u.id().to_string()))
        .unwrap_or_else(|| None);

    // Execute all the routes
    let response = next.run(request).await;

    // Response
    let duration = start_time.elapsed().as_millis();
    let status = response.status().as_u16();

    // Reponse size
    let response_headers_size: usize = response.headers().iter().map(|(k, v)| k.as_str().len() + v.len()).sum();
    let response_body_size = response.body().size_hint().lower();
    let total_response_size = (response_headers_size as u64) + response_body_size;

    tokio::spawn(async move {
        send_to_loki(
            &route,
            &method,
            status,
            duration,
            total_request_size,
            total_response_size,
            &ip,
            user_id,
        ).await;
    });

    response
}

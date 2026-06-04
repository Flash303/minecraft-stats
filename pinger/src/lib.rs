pub mod models;
pub mod utils;

use crate::models::model::PingResponse;
use crate::utils::error::PingError;
use crate::utils::minecraft_serialisation::read_string;
use crate::utils::protocol::{create_ping_handshake, create_ping_request, read_packet};
use std::time::Duration;
use bytes::{BufMut, BytesMut};
use log::debug;
use tokio::io::AsyncWriteExt;
use crate::utils::dns::resolve_srv;
use tokio::net::{lookup_host, TcpStream};
use tokio::time::timeout;

pub async fn ping_server(ip: &str, port: u16) -> Result<PingResponse, PingError> {
    match timeout(Duration::from_secs(5), ping_server_internal(ip, port)).await {
        Ok(result) => result,
        Err(_) => {
            debug!("Global ping timeout for {}:{}", ip, port);
            Err(PingError::TimeoutError)
        }
    }
}

async fn ping_server_internal(ip: &str, port: u16) -> Result<PingResponse, PingError> {
    debug!("Pinging server {}:{}", ip, port);

    let (target_ip, target_port) = resolve_srv(ip, port).await;
    let addr_str = format!("{}:{}", target_ip, target_port);

    let addr = lookup_host(&addr_str)
        .await
        .map_err(|e| {
            println!("First address resolve error: {}", e);
            PingError::AddressParseError
        })?
        .next()
        .ok_or(PingError::AddressParseError)?;

    let stream_future = TcpStream::connect(addr);
    let mut stream = timeout(Duration::from_secs(1), stream_future)
        .await
        .map_err(|_| {
            debug!("Connection timeout error");
            PingError::ConnectionRefused
        })?
        .map_err(|e| {
            debug!("Connection error: {}", e);
            PingError::ConnectionRefused
        })?;

    stream.set_nodelay(true).unwrap_or_default();

    debug!("Stream connected to {}", addr);

    let mut merged_packets = BytesMut::new();
    merged_packets.put(create_ping_handshake(&ip.to_string(), &port));
    merged_packets.put(create_ping_request());

    stream.write_all(&merged_packets.freeze())
        .await
        .map_err(|_| PingError::SendPacketError)?;
    debug!("Stream all packets !");

    let mut packet = read_packet(&mut stream).await?;
    debug!("Received Packet ID: {}", packet.id());

    let json = read_string(&mut packet.data);

    let as_res = serde_json::from_str::<PingResponse>(&json)
        .map_err(|e| {
             debug!("Error deserializing ping response: {}, json {}", e, json);
            PingError::SerializationError
        })?;
    Ok(as_res)
}
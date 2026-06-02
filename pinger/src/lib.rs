pub mod models;
pub mod utils;

use crate::models::model::PingResponse;
use crate::utils::error::PingError;
use crate::utils::minecraft_serialisation::read_string;
use crate::utils::protocol::{create_ping_handshake, create_ping_request, read_packet};
use std::io::Write;
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;
use log::debug;

pub async fn ping_server(ip: &str, port: u16) -> Result<PingResponse, PingError> {
    debug!("Pinging server {}:{}", ip, port);
    let addr = format!("{}:{}", ip, port)
        .to_socket_addrs()
        .map_err(|_| PingError::AddressParseError)?
        .next()
        .ok_or(PingError::AddressParseError)?;
    let mut stream = TcpStream::connect_timeout(&addr, Duration::from_secs(1))
        .map_err(|_| PingError::ConnectionRefused)?;
    debug!("Stream connected to {}", addr);

    stream.write(&create_ping_handshake(&ip.to_string(), &port)).map_err(|_| PingError::SendPacketError)?;
    debug!("Stream sent handshake");

    stream.write(&create_ping_request()).map_err(|_| PingError::SendPacketError)?;
    debug!("Stream sent request");

    let mut packet = read_packet(&mut stream)?;
    debug!("Received Packet ID: {}", packet.id());

    let json = read_string(&mut packet.data);

    let as_res = serde_json::from_str::<PingResponse>(&json).map_err(|_| PingError::SerializationError)?;
    Ok(as_res)
}
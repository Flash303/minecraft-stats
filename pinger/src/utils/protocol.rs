use std::io::Read;
use std::net::TcpStream;
use bytes::{BufMut, Bytes, BytesMut};
use crate::utils::error::PingError;
use crate::utils::minecraft_serialisation::{read_var_int, write_string, write_var_int};

pub fn create_ping_handshake(ip: &String, port: &u16) -> Bytes {
    let mut handshake = BytesMut::new();
    handshake.put_u8(0x00);
    write_var_int(&mut handshake, -1); // protocol version
    write_string(&mut handshake, ip);
    handshake.put_u16(*port); // Server Port
    write_var_int(&mut handshake, 1); // next state = 1 status

    create_packet_header(handshake.freeze())
}

pub fn create_ping_request() -> Bytes {
    let mut packet = BytesMut::new();
    write_var_int(&mut packet, 1); // lenght
    write_var_int(&mut packet, 0x00); // packet id
    
    packet.freeze()
}

fn create_packet_header(packet: Bytes) -> Bytes {
    let mut data = BytesMut::new();
    write_var_int(&mut data, packet.len() as i32);
    data.extend_from_slice(&packet);
    data.freeze()
}

pub struct Packet {
    id: u8,
    pub data: Bytes,
}

impl Packet {
    pub fn new(id: u8, data: Bytes) -> Packet {
        Packet { id, data }
    }

    pub fn id(&self) -> u8 {
        self.id
    }
}

pub fn read_packet(stream: &mut TcpStream) -> Result<Packet, PingError> {
    // Lire le varint de longueur
    let mut length_buf = BytesMut::new();
    loop {
        let mut byte = [0u8; 1];
        stream.read_exact(&mut byte).map_err(|_| PingError::ReadPacketError)?;
        length_buf.put_u8(byte[0]);
        if byte[0] & 0x80 == 0 { break; }
    }
    let mut length_bytes = Bytes::from(length_buf);
    let length = read_var_int(&mut length_bytes) as usize;

    // Lire exactement `length` bytes
    let mut buf = vec![0u8; length];
    stream.read_exact(&mut buf).map_err(|_| PingError::ReadPacketError)?;
    
    let mut data = Bytes::from(buf);
    
    Ok(Packet::new(read_var_int(&mut data) as u8, data))
}
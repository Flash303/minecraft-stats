#[derive(Debug)]
pub enum PingError {
    ConnectionRefused,
    SendPacketError,
    ReadPacketError,
    SerializationError,
    AddressParseError,
}
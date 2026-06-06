use bytes::{Buf, BufMut, Bytes, BytesMut};

pub fn write_var_int(buffer: &mut BytesMut, x: i32) {
    let mut ux = x as u32; // cast en u32 pour le logical shift
    while (ux & 0xFFFFFF80) != 0 {
        buffer.put_u8((ux as u8 & 0x7F) | 0x80);
        ux >>= 7;
    }
    buffer.put_u8(ux as u8);
}

pub fn write_string(buffer: &mut BytesMut, string: &str) {
    write_var_int(buffer, string.len() as i32);
    buffer.put_slice(string.as_bytes());
}

pub fn read_var_int(buf: &mut Bytes) -> i32 {
    let mut result = 0i32;
    let mut shift = 0;
    loop {
        let byte = buf.get_u8();
        result |= ((byte & 0x7F) as i32) << shift;
        if byte & 0x80 == 0 {
            break;
        }
        shift += 7;
    }
    result
}

pub fn read_string(buf: &mut Bytes) -> String {
    let len = read_var_int(buf) as usize;
    let bytes = buf.split_to(len);
    String::from_utf8(bytes.to_vec()).unwrap()
}
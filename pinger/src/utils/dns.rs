use hickory_resolver::proto::rr::RData;
use hickory_resolver::Resolver;

pub async fn resolve_srv(ip: &str, default_port: u16) -> (String, u16) {
    let resolver_builder = Resolver::builder_tokio();
    if let Err(_) = resolver_builder {
        return (ip.to_string(), default_port);
    }
    let resolver = resolver_builder.unwrap().build();
    if let Err(_) = resolver {
        return (ip.to_string(), default_port);
    }
    let resolver = resolver.unwrap();

    let srv_record = format!("_minecraft._tcp.{}", ip);

    if let Ok(lookup) = resolver.srv_lookup(srv_record.as_str()).await {
        for record in lookup.answers() {
            if let RData::SRV(srv) = &record.data {
                let target = srv.target.to_string();
                let clean_target = target.trim_end_matches('.').to_string();

                return (clean_target, srv.port);
            }
        }
    }

    // Fallback
    (ip.to_string(), default_port)
}
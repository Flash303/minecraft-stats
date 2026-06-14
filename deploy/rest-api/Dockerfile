# syntax=docker/dockerfile:1
FROM rust:alpine AS builder
RUN apk add --no-cache musl-dev pkgconfig openssl-dev git

WORKDIR /app
COPY backend ./backend

RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/backend/target \
    cargo build --release --manifest-path backend/Cargo.toml --bin rest-api && \
    cp backend/target/release/rest-api /app/rest-api

FROM alpine:latest
WORKDIR /app
RUN apk add --no-cache tini ca-certificates openssl
COPY --from=builder /app/rest-api /app/rest-api
RUN chmod +x /app/rest-api
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/rest-api"]

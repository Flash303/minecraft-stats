# syntax=docker/dockerfile:1
FROM rust:1.98.1-alpine3.24 AS builder
RUN apk add --no-cache musl-dev pkgconfig openssl-dev git perl make

WORKDIR /app
COPY backend ./backend

RUN --mount=type=cache,target=/usr/local/cargo/registry,sharing=locked \
    --mount=type=cache,target=/app/backend/target,sharing=locked \
    cargo build --release --manifest-path backend/Cargo.toml --bin worker && \
    cp backend/target/release/worker /app/worker

FROM alpine:3.24.3
WORKDIR /app
RUN apk add --no-cache tini ca-certificates openssl
COPY --from=builder /app/worker /app/worker
RUN chmod +x /app/worker
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/worker"]

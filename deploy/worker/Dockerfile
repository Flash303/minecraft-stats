FROM alpine:latest
WORKDIR /app

RUN apk add --no-cache tini

COPY worker /app/worker

RUN chmod +x /app/worker

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/worker"]

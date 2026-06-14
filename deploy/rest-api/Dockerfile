FROM alpine:latest
WORKDIR /app

RUN apk add --no-cache tini

COPY rest-api /app/rest-api

RUN chmod +x /app/rest-api

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/rest-api"]

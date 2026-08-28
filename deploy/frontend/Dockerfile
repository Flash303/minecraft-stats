# syntax=docker/dockerfile:1
FROM oven/bun:alpine AS builder

ENV CI=true

WORKDIR /app

# Copy package config and lockfile
COPY frontend/package.json frontend/bun.lock ./frontend/

WORKDIR /app/frontend
# Install dependencies with Bun
RUN bun install --frozen-lockfile

# Copy the rest of the source
WORKDIR /app
COPY frontend ./frontend

# Build args
ARG VITE_API_URL
ARG VITE_CLERK_PUBLISHABLE_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

WORKDIR /app/frontend
RUN bun run build

# Final Stage (Bun SSR)
FROM oven/bun:alpine

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/frontend/node_modules ./node_modules
COPY --from=builder /app/frontend/build ./build
COPY --from=builder /app/frontend/app ./app
COPY --from=builder /app/frontend/server.ts ./
COPY --from=builder /app/frontend/security.ts ./
COPY --from=builder /app/frontend/package.json ./

ENV NODE_ENV=production
ENV PORT=80

EXPOSE 80

CMD ["bun", "run", "server.ts"]

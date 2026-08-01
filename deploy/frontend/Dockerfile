# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable

WORKDIR /app

# Copy package config and lockfile
COPY frontend/package.json frontend/pnpm-lock.yaml ./frontend/

WORKDIR /app/frontend
# Configure pnpm store path and install dependencies with cache
RUN pnpm config set store-dir /pnpm/store
RUN --mount=type=cache,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# Copy the rest of the source
WORKDIR /app
COPY frontend ./frontend

# Build args
ARG VITE_API_URL
ARG VITE_CLERK_PUBLISHABLE_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

WORKDIR /app/frontend
RUN pnpm build

# Final Stage (Bun SSR)
FROM oven/bun:alpine

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/frontend/node_modules ./node_modules
COPY --from=builder /app/frontend/build ./build
COPY --from=builder /app/frontend/server.ts ./
COPY --from=builder /app/frontend/package.json ./

ENV NODE_ENV=production
ENV PORT=80

EXPOSE 80

CMD ["bun", "run", "server.ts"]

# ────────────────────────────────────────────────────────────
# Agent Workspace — Sandbox VM Base Image
#
# Includes:
#   - Node.js (for the agent HTTP server)
#   - rclone (for S3 ↔ local sync)
#   - Common dev tools (git, curl, jq, python3, tree, etc.)
# ────────────────────────────────────────────────────────────

FROM node:20-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    curl \
    git \
    jq \
    tree \
    python3 \
    python3-pip \
    ca-certificates \
    unzip \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Install rclone
RUN curl -fsSL https://rclone.org/install.sh | bash

# ── Build the agent ────────────────────────────────────────

FROM base AS builder

WORKDIR /build
COPY packages/agent/package.json packages/agent/pnpm-lock.yaml* ./
RUN npm install --production=false

COPY packages/agent/src ./src
COPY packages/agent/tsconfig.json ./
RUN npx tsup src/index.ts --format esm

# ── Final image ────────────────────────────────────────────

FROM base

# rclone config for S3
RUN mkdir -p /root/.config/rclone
COPY <<EOF /root/.config/rclone/rclone.conf
[s3]
type = s3
provider = Other
env_auth = true
endpoint = ${S3_ENDPOINT}
acl = private
EOF

# Workspace mount point
RUN mkdir -p /workspace

# Agent binary
WORKDIR /agent
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/package.json ./

EXPOSE 8080

CMD ["node", "dist/index.js"]

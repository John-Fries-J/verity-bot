# syntax=docker/dockerfile:1

ARG NODE_VERSION=22

FROM --platform=$TARGETPLATFORM node:${NODE_VERSION}-bookworm-slim AS deps

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
# Omit optional dependencies so prism-media does not pull old ffmpeg-static or
# @discordjs/opus on the Pi. Install the ARM64 DAVE optional package directly
# because @discordjs/voice 0.19.x uses it for modern Discord voice support.
RUN npm ci --omit=dev --omit=optional \
    && npm install --omit=dev --no-save @snazzah/davey-linux-arm64-gnu@0.1.12 \
    && npm cache clean --force

FROM --platform=$TARGETPLATFORM node:${NODE_VERSION}-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

USER node

CMD ["npm", "start"]

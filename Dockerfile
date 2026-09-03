# syntax=docker/dockerfile:1

ARG NODE_VERSION=20

FROM --platform=$TARGETPLATFORM node:${NODE_VERSION}-bookworm-slim AS deps

WORKDIR /app
ENV NODE_ENV=production

# Native production dependencies such as @discordjs/opus may need a compiler
# during install. Keep the build toolchain out of the final runtime image.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        g++ \
        make \
        python3 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force

FROM --platform=$TARGETPLATFORM node:${NODE_VERSION}-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

USER node

CMD ["npm", "start"]

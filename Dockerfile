FROM linuxserver/ffmpeg:latest

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        gnupg \
        ca-certificates \
        python3 \
        make \
        g++ \
        sqlite3 \
        libsqlite3-dev && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g corepack && \
    corepack enable && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ./package.json ./yarn.lock ./.yarnrc.yml ./
COPY ./.yarn ./.yarn

RUN echo "enableGlobalCache: false" >> .yarnrc.yml
RUN --mount=type=cache,target=/app/.yarn/cache yarn workspaces focus --production

COPY ./dist ./dist
COPY ./locales ./locales

ENTRYPOINT []
CMD ["yarn", "start"]

FROM linuxserver/ffmpeg:latest

RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
        sqlite3 \
        libsqlite3-dev \
        nodejs \
        npm && \
    rm -rf /var/lib/apt/lists/* && \
    npm install -g corepack && \
    corepack enable

WORKDIR /app

COPY ./package.json ./yarn.lock ./.yarnrc.yml ./
COPY ./.yarn ./.yarn

RUN echo "enableGlobalCache: false" >> .yarnrc.yml
RUN --mount=type=cache,target=/app/.yarn/cache yarn workspaces focus --production

COPY ./dist ./dist
COPY ./locales ./locales

ENTRYPOINT []
CMD ["node", "dist/index.js"]

FROM linuxserver/ffmpeg:latest

RUN apt-get -y update  && \
    apt-get -y --no-install-recommends install nodejs npm && \
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

CMD ["node", "dist/index.js"]

FROM node:lts-alpine

RUN apk add ffmpeg

WORKDIR /app

COPY ./package.json ./yarn.lock ./.yarnrc.yml ./
COPY ./.yarn ./.yarn

RUN echo "enableGlobalCache: false" >> .yarnrc.yml
RUN --mount=type=cache,target=/app/.yarn/cache yarn workspaces focus --production

COPY ./dist ./dist
COPY ./locales ./locales

CMD ["node", "dist/index.js"]

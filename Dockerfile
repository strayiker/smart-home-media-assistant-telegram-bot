FROM node:lts-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY --link ./dist ./dist
COPY --link ./locales ./locales
COPY --link ./package.json ./yarn.lock ./.yarnrc.yml ./
COPY --link ./.yarn ./.yarn

RUN --mount=type=cache,target=/app/.yarn/cache yarn workspaces focus --production

CMD ["node", "dist/index.js"]

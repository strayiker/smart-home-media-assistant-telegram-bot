# Stage 1: Build
FROM node:lts-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN echo "enableGlobalCache: false" >> .yarnrc.yml
RUN --mount=type=cache,target=/app/.yarn/cache yarn install --immutable

# Copy source files
COPY . .

# Build the project
RUN yarn build

# Stage 2: Runtime
FROM node:lts-alpine

# Set working directory
WORKDIR /app

# Copy only the necessary files from the build stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json /app/yarn.lock /app/.yarnrc.yml ./
COPY --from=builder /app/.yarn ./.yarn

# Install only production dependencies
RUN --mount=type=cache,target=/app/.yarn/cache yarn workspaces focus --production

# Command to run the app
CMD ["node", "dist/index.js"]

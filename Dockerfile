# Base image with Node.js 20
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Dependencies stage
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/core/package.json packages/core/
COPY packages/chat/package.json packages/chat/
COPY packages/gateway/package.json packages/gateway/
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/packages/chat/node_modules ./packages/chat/node_modules
COPY --from=deps /app/packages/gateway/node_modules ./packages/gateway/node_modules
COPY --from=deps /app/packages/web/node_modules ./packages/web/node_modules
COPY . .
RUN pnpm build

# Gateway production image
FROM base AS gateway
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy built packages with proper ownership
COPY --from=build --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=nodejs:nodejs /app/packages/shared/package.json ./packages/shared/
COPY --from=build --chown=nodejs:nodejs /app/packages/core/dist ./packages/core/dist
COPY --from=build --chown=nodejs:nodejs /app/packages/core/package.json ./packages/core/
COPY --from=build --chown=nodejs:nodejs /app/packages/chat/dist ./packages/chat/dist
COPY --from=build --chown=nodejs:nodejs /app/packages/chat/package.json ./packages/chat/
COPY --from=build --chown=nodejs:nodejs /app/packages/gateway/dist ./packages/gateway/dist
COPY --from=build --chown=nodejs:nodejs /app/packages/gateway/package.json ./packages/gateway/
COPY --chown=nodejs:nodejs package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install production dependencies
RUN pnpm install --prod --frozen-lockfile

# Create data directory with proper permissions
RUN mkdir -p /app/data && chown -R nodejs:nodejs /app/data

# Switch to non-root user
USER nodejs

EXPOSE 3100
CMD ["node", "packages/gateway/dist/index.js"]

# Web production image (nginx)
FROM nginx:alpine AS web
COPY --from=build /app/packages/web/.next/standalone /usr/share/nginx/html
COPY --from=build /app/packages/web/.next/static /usr/share/nginx/html/_next/static
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]

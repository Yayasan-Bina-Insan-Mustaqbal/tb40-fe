FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy dependency files
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (dev included for build)
RUN pnpm install --frozen-lockfile

# Copy application files
COPY . .

# Build for production
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy built output from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# native modules (better-sqlite3) need node_modules
# copy full node_modules since native addons need to be pre-built
COPY --from=builder /app/node_modules ./node_modules

# Expose port
EXPOSE 3030

# Start SSR server
CMD ["node", "dist/server/server.js"]

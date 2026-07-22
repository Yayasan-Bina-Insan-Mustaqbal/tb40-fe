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

RUN npm install -g pnpm

WORKDIR /app

# Copy server code
COPY --from=builder /app/dist/server ./dist/server

# Copy client assets to public folder so srvx serves them natively
COPY --from=builder /app/dist/client ./public

# Copy packages
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Expose port
EXPOSE 3030

# Start SSR server using package start script
CMD ["pnpm", "start", "--port", "3030", "--host", "0.0.0.0"]

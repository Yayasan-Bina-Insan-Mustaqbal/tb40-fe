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

# Copy built outputs from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Expose port
EXPOSE 3030

# Start SSR server using package start script
CMD ["pnpm", "start", "--port", "3030", "--host", "0.0.0.0"]

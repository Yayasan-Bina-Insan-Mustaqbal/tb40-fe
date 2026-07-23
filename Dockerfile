FROM node:20-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

# Copy dependency manifests
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application files
COPY . .

# Build for production
RUN pnpm build

# Production runner stage
FROM node:20-alpine AS runner

RUN npm install -g pnpm

WORKDIR /app

# Copy server build
COPY --from=builder /app/dist/server ./dist/server

# Copy static assets to public folder
COPY --from=builder /app/dist/client ./public

# Copy package manifests & node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3030

# Start SSR production server
CMD ["pnpm", "start", "--port", "3030", "--host", "0.0.0.0"]

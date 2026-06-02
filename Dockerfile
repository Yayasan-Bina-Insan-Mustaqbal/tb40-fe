FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy dependency files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Copy application files
COPY . .

# Expose Vite dev port 3000
EXPOSE 3000

# Start dev server bound to all interfaces
CMD ["pnpm", "dev", "--host"]

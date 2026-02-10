FROM oven/bun:1-alpine

WORKDIR /app

# Install system deps needed by native modules
RUN apk add --no-cache docker-cli docker-cli-compose

# Copy package files and install deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

EXPOSE 3000

CMD ["bun", "run", "index.ts"]

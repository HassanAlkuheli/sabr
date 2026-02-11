FROM oven/bun:1-debian

WORKDIR /app

# Install Chromium and deps for Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libgbm1 \
    libasound2 \
    libcups2 \
    libxshmfence1 \
    libxcomposite1 \
    libxrandr2 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Tell Playwright to use system Chromium
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Copy package files and install deps
COPY package.json bun.lock* ./
RUN bun install --production

# Copy source code
COPY . .

EXPOSE 3001

CMD ["bun", "run", "index.ts"]

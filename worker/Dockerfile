# ── Stage 1: Install dependencies ──
FROM oven/bun:1-debian AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --production

# ── Stage 2: Final image with Chromium ──
FROM oven/bun:1-debian

WORKDIR /app

# Install Chromium (minimal deps only) and clean up in the same layer
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       chromium \
       fonts-liberation \
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
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* /var/cache/apt/*

# Tell Playwright to use system Chromium
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Copy deps from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

# Copy source code
COPY . .

EXPOSE 3001

CMD ["bun", "run", "index.ts"]

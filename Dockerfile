# official Playwright image with Ubuntu 22.04
FROM mcr.microsoft.com/playwright:v1.41.0-jammy

RUN apt-get update && apt-get install -y \
    unzip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

ENV BUN_INSTALL="/root/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"
RUN curl -fsSL https://bun.sh/install | bash

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]

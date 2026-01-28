# Use the official Playwright image (Focal is Ubuntu 20.04)
FROM mcr.microsoft.com/playwright:v1.41.0-focal

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV BUN_INSTALL="/root/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
RUN bun install

# Copy source
COPY . .

# Expose port
EXPOSE 3000

# Run the app
CMD ["bun", "run", "src/index.ts"]

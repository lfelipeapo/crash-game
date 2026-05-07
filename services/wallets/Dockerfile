FROM oven/bun:1-alpine

WORKDIR /app

# Copy workspace root and package files first (for layer caching)
COPY package.json bun.lock* ./
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY services/games/package.json ./services/games/package.json
COPY services/wallets/package.json ./services/wallets/package.json
COPY frontend/package.json ./frontend/package.json

# Install monorepo dependencies
RUN bun install --frozen-lockfile || bun install

# Copy source code for contracts and wallets service
COPY packages/contracts ./packages/contracts
COPY services/wallets ./services/wallets

# Generate Prisma client for wallets
RUN cd services/wallets && bun run prisma:generate

# Build contracts (if needed)
RUN cd packages/contracts && bun run build 2>/dev/null || true

WORKDIR /app/services/wallets

EXPOSE 4002

CMD ["sh", "-c", "bun run prisma:migrate && bun run prisma:seed && bun run src/main.ts"]

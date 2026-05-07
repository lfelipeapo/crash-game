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

# Copy source code for contracts and games service
COPY packages/contracts ./packages/contracts
COPY services/games ./services/games

# Generate Prisma client for games
RUN cd services/games && bun run prisma:generate

# Build contracts (if needed)
RUN cd packages/contracts && bun run build 2>/dev/null || true

WORKDIR /app/services/games

EXPOSE 4001

CMD ["sh", "-c", "bun run prisma:migrate && bun run src/main.ts"]

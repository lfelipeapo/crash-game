FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copy root and all workspace package.json files
COPY package.json ./
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY services/games/package.json ./services/games/package.json
COPY services/wallets/package.json ./services/wallets/package.json
COPY frontend/package.json ./frontend/package.json

# Install workspace dependencies
RUN bun install

# Copy source code for frontend and contracts only
COPY packages/contracts ./packages/contracts
COPY frontend ./frontend

# Build frontend
RUN cd frontend && bun run build

FROM nginx:alpine
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]

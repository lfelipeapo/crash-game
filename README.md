# Crash Game — Jungle Gaming Fullstack Challenge

> Implementação completa de um Crash Game multiplayer em tempo real com arquitetura de microserviços, DDD e mensageria.

## Autor

**Luiz Felipe Apolinário**

Desenvolvedor full-stack especializado em sistemas distribuídos, iGaming e arquitetura orientada a eventos. Este projeto foi construído como solução para o desafio técnico da Jungle Gaming.

## Descrição

O **Crash Game** é um jogo de cassino multiplayer em tempo real onde um multiplicador sobe a partir de `1.00x` e pode "crashar" a qualquer momento. Jogadores apostam durante a fase de apostas e podem sacar (cash out) a qualquer momento durante a rodada para garantir seus ganhos. Quem não sacar antes do crash perde a aposta.

**Tecnologias demonstradas:** comunicação assíncrona via RabbitMQ, precisão monetária com `bigint` (centavos), algoritmo Provably Fair verificável por HMAC-SHA256, WebSocket via Kong, autenticação OIDC com Keycloak (PKCE + JWT).

## Stack Completa

| Camada | Tecnologia |
|--------|------------|
| **Runtime** | Bun 1.x |
| **Backend** | NestJS 11 + TypeScript (strict mode) |
| **Banco** | PostgreSQL 18 + Prisma ORM |
| **Mensageria** | RabbitMQ 4.x |
| **API Gateway** | Kong 3.9 (DB-less / declarative) |
| **IdP** | Keycloak 26.5 |
| **WebSocket** | `@nestjs/websockets` + Socket.IO via Kong |
| **Frontend** | React 19 + Vite 6 + Tailwind CSS 4 |
| **Estado** | Zustand (cliente) + TanStack Query (servidor) |
| **Testes** | Bun Test Runner |
| **Docs API** | Swagger / OpenAPI |
| **Infra** | Docker Compose |

## Arquitetura

```
                    +---------------------------+
                    |        Frontend            |
                    |   React + Tailwind + Vite  |
                    |       (Porta 3000)         |
                    +------+-------------+-------+
                           |             |
                      HTTP/REST     WebSocket
                           |             |
                    +------v-------------v-------+
                    |          Kong               |
                    |     API Gateway (8000)      |
                    +------+-------------+-------+
                           |             |
              +------------v--+   +------v------------+
              |  Game Service |   |  Wallet Service   |
              |   (NestJS)    |   |    (NestJS)       |
              |   Porta 4001  |   |    Porta 4002     |
              +--+--+----+----+   +---------+---------+
                 |  |    |                  |
            +----v--+    |            +------v------+
            | PostgreSQL |            |  RabbitMQ   |
            |  (5432)    |            |   (5672)    |
            +------------+            +-------------+
                    ^                        ^
                    |                        |
              +-----v------------------------v---+
              |          Keycloak (8080)       |
              +--------------------------------+
```

### Bounded Contexts

**Game Service** — Ciclo de vida da rodada, apostas, lógica de crash, provably fair e WebSocket. Agregados: Round, Bet, Crash Point.

**Wallet Service** — Carteira do jogador: saldo, crédito e débito. Agregados: Wallet, WalletTransaction (com idempotência).

## Rotas REST via Kong

Kong recebe tudo na porta `8000` com `strip_path: true`. Os controllers NestJS usam paths limpos (`rounds/current`, `bet`, `me`) e Kong adiciona/remove o prefixo automaticamente — sem duplicação.

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| `GET` | `/games/health` | Não | Health check |
| `GET` | `/games/rounds/current` | Não | Rodada atual |
| `GET` | `/games/rounds/history` | Não | Histórico de rodadas |
| `GET` | `/games/rounds/:roundId/verify` | Não | Verificação provably fair |
| `GET` | `/games/bets/me` | Sim | Minhas apostas |
| `POST` | `/games/bet` | Sim | Fazer aposta |
| `POST` | `/games/bet/cashout` | Sim | Sacar |
| `GET` | `/games/leaderboard` | Não | Top jogadores |
| `POST` | `/wallets` | Sim | Criar carteira |
| `GET` | `/wallets/me` | Sim | Meu saldo |

## WebSocket

O WebSocket passa pelo Kong via `/games/socket.io` (encaminhado ao Game Service em `/socket.io`). Apenas transporte `websocket` é usado — long-polling desabilitado para compatibilidade com o proxy.

```javascript
const socket = io("http://localhost:8000/game", {
  path: "/games/socket.io",
  transports: ["websocket"],
});
```

**Eventos principais:** `round.betting.started`, `round.running.started`, `round.multiplier.tick`, `round.crashed`, `bet.accepted`, `bet.rejected`, `bet.cashed_out`, `wallet.balance.updated`, `round.snapshot`.

## Fluxo de Aposta

1. Jogador envia `POST /games/bet` com `amountCents` e `autoCashoutMultiplierX100` opcional
2. JWT validado via Keycloak
3. `PlaceBetUseCase` valida valor, estado "betting" e aposta única por rodada
4. Bet criada em `PENDING_DEBIT` e persistida no PostgreSQL
5. `wallet.debit.requested` publicado no RabbitMQ
6. Wallet Service consome, debita saldo, publica `wallet.debit.succeeded`
7. Game consome sucesso, transiciona bet para `ACCEPTED`
8. Evento `bet.accepted` emitido via WebSocket

## Fluxo de Cashout

1. Jogador envia `POST /games/bet/cashout`
2. `CashOutUseCase` valida rodada "running", bet `ACCEPTED`, multiplicador < crash point
3. `Bet.cashOut(multiplierX100)` calcula `payout = amountCents * multiplier / 100`
4. Bet atualizado para `CASHED_OUT` no PostgreSQL
5. `wallet.credit.requested` publicado no RabbitMQ
6. Wallet Service consome e credita saldo
7. Evento `bet.cashed_out` emitido via WebSocket

## Precisão Monetária

**NUNCA ponto flutuante para dinheiro.** Todos os valores são `bigint` em centavos.

```typescript
// Cálculo de payout
function calculatePayoutCents(amountCents: bigint, multiplierX100: number): bigint {
  return (amountCents * BigInt(multiplierX100)) / 100n;
}
// $10.00 @ 2.50x = 1000n * 250 / 100 = 2500n ($25.00)
```

O schema Prisma usa `BigInt` para `amountCents`, `payoutCents` e `balanceCents`.

## Provably Fair

Algoritmo **HMAC_SHA256_SHA256_COMMITMENT_V1**. O servidor gera `serverSeed` aleatório (32 bytes), publica `SHA256(serverSeed)` antes das apostas, e só revela após o crash.

```bash
curl http://localhost:8000/games/rounds/{roundId}/verify
```

Retorna: `roundId`, `serverSeed`, `serverSeedHash`, `clientSeed`, `nonce`, `hmac` (HMAC-SHA256 real, 64 hex), `crashPointX100`, `algorithm: "HMAC_SHA256_SHA256_COMMITMENT_V1"`, `houseEdge: 0.03`.

### Verificação Independente

1. Calcular `SHA256(serverSeed)` e comparar com `serverSeedHash`
2. Calcular `HMAC-SHA256(serverSeed, clientSeed + ":" + nonce)`
3. Pegar primeiros 8 chars hex, converter para inteiro 32-bit
4. Aplicar: `crashPoint = (1 - 0.03) / (1 - (int / 2^32))`
5. Comparar com `crashPointX100` retornado

## Autenticação

- **IdP**: Keycloak com realm `crash-game`
- **Flow**: OIDC Authorization Code + PKCE S256
- **Tokens**: JWT (access_token + refresh_token)
- **Validação**: JWKS do Keycloak em cada serviço
- **Realm importado automaticamente** via `docker compose up`

## Como Rodar

**Pré-requisitos:** Bun >= 1.x, Docker & Docker Compose

```bash
git clone <repo-url> && cd crash-game-fullstack
bun install
bun run docker:up
# Aguarde ~30-60s para Keycloak importar o realm
```

> Para desenvolvimento local (sem Docker), use `bun run install:all` que também gera os Prisma clients.

### URLs e Portas

| Serviço | URL |
|---------|-----|
| Frontend | `http://localhost:3000` |
| API Gateway (Kong) | `http://localhost:8000` |
| Swagger Game (direto) | `http://localhost:4001/api/docs` |
| Swagger Wallet (direto) | `http://localhost:4002/api/docs` |
| Keycloak Admin | `http://localhost:8080` |
| RabbitMQ Management | `http://localhost:15672` (`admin`/`admin`) |

## Usuário de Teste

| Username | `player` |
| Password | `player123` |
| Saldo inicial | $1,000.00 (seed automático no primeiro startup) |

## Testes

```bash
# Unitários
cd packages/contracts && bun test
cd services/games && bun test
cd services/wallets && bun test
cd frontend && bun test

# E2E (requer docker:up)
curl -sf http://localhost:8000/games/health
curl -sf http://localhost:8000/wallets/health
cd services/games && bun run test:e2e
cd services/wallets && bun run test:e2e
```

**Cobertura:** `calculateHmac()` é determinístico e retorna 64 chars hex; E2E valida que `hmac` não é vazio e o algoritmo é `HMAC_SHA256_SHA256_COMMITMENT_V1`; teste de receita reproduz verificação independente completa.

## Decisões Técnicas

- **Prisma** — Type-safety nativo, migrações declarativas, evolução independente por bounded context.
- **RabbitMQ direto** — Simplicidade; consistência garantida por `idempotencyKey` e estados transacionais. Outbox seria evolução natural.
- **Kong DB-less** — Configuração versionada em `kong.yml`, sem banco dedicado. `strip_path: true` evita duplicação de prefixos.
- **NestJS** — DI nativa, modularidade, integração com WebSocket/Swagger/RabbitMQ.
- **Bun** — Runtime + bundler + test runner + package manager, mais rápido que Node.js.

## Trade-offs Honestos

| Simplificado | Em produção |
|-------------|-------------|
| **WebSocket via Kong** | Funciona e mantém a arquitetura atrás do gateway, mas adiciona um hop. Em produção, a decisão dependeria de latência, escala e estratégia de proxy. |
| **Outbox/Inbox transacional** | A entrega usa RabbitMQ com idempotência e transações no banco. Em produção, uma tabela outbox/inbox reduziria risco de inconsistência entre commit no banco e publicação de evento. |
| **Saga simplificada** | O fluxo Game ↔ Wallet usa eventos assíncronos, estados transacionais e idempotência. Em produção, evoluiria para compensações automáticas, DLQ e reconciliação. |
| **Client Seed** | O crash point é verificável por HMAC, serverSeed, serverSeedHash e nonce. Em produção, o jogador poderia configurar seu próprio clientSeed. |
| **Observabilidade** | Logs e healthchecks são suficientes para o desafio. Em produção, adicionaria OpenTelemetry, Prometheus e Grafana. |
| **E2E de navegador** | A entrega cobre testes unitários e E2E de API. Fluxos completos no browser com Playwright ficam como evolução. |

## Bônus Implementados

- ✅ CI Pipeline (GitHub Actions)
- ✅ Rate Limiting (10 req/10s global)
- ✅ Auto Cashout (`autoCashoutMultiplierX100` no backend)
- ✅ Leaderboard (`GET /games/leaderboard?period=24h|7d`)
- ✅ Swagger/OpenAPI em ambos serviços
- ✅ Seed de Wallet automático ($1.000 para `player`)
- ✅ CORS no Kong
- ✅ Healthchecks Docker Compose + restart automático
- ✅ HMAC-SHA256 real no Provably Fair (não string vazia)
- ✅ WebSocket via Kong para consistência arquitetural

## Próximos Passos

1. Outbox/Inbox Transacional — exactly-once processing
2. OpenTelemetry + Prometheus + Grafana
3. Playwright E2E no browser
4. Auto Bet com estratégias (Martingale, valor fixo)
5. Leaderboard em tempo real via WebSocket
6. Personalização de `clientSeed` pelo jogador
7. Efeitos sonoros (aposta, cashout, crash)
8. Mobile app (React Native ou PWA)

---

Projeto desenvolvido para fins de avaliação técnica. Código aberto para revisão da Jungle Gaming.

**Autor: Luiz Felipe Apolinário**

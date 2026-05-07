import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { GamesController } from "./presentation/controllers/games.controller";
import { GameGateway } from "./presentation/gateways/game.gateway";
import { PrismaModule } from "./infrastructure/prisma/prisma.module";
import { RabbitMQModule } from "./infrastructure/rabbitmq/rabbitmq.module";
import { GameEventBus } from "./infrastructure/game/game-event-bus.service";
import { GameLoopService } from "./infrastructure/game/game-loop.service";
import { PrismaRoundRepository } from "./infrastructure/repositories/prisma-round.repository";
import { PrismaBetRepository } from "./infrastructure/repositories/prisma-bet.repository";
import { PlaceBetUseCase } from "./application/use-cases/place-bet.use-case";
import { CashOutUseCase } from "./application/use-cases/cash-out.use-case";
import { GetCurrentRoundUseCase } from "./application/use-cases/get-current-round.use-case";
import { GetRoundHistoryUseCase } from "./application/use-cases/get-round-history.use-case";
import { GetMyBetsUseCase } from "./application/use-cases/get-my-bets.use-case";
import { GetLeaderboardUseCase } from "./application/use-cases/get-leaderboard.use-case";
import { HandleWalletDebitResponseUseCase } from "./application/use-cases/handle-wallet-debit-response.use-case";
import { HandleWalletCreditResponseUseCase } from "./application/use-cases/handle-wallet-credit-response.use-case";
import type { IRoundRepository } from "./domain/repositories/round.repository.interface";
import type { IBetRepository } from "./domain/repositories/bet.repository.interface";
import type { IWalletEventPublisher } from "./application/interfaces/wallet-event-publisher.interface";
import { WalletEventPublisher } from "./infrastructure/rabbitmq/publishers/wallet-event.publisher";
import { WalletDebitResponseConsumer } from "./infrastructure/rabbitmq/consumers/wallet-debit-response.consumer";
import { WalletCreditResponseConsumer } from "./infrastructure/rabbitmq/consumers/wallet-credit-response.consumer";

@Module({
  imports: [
    PrismaModule,
    RabbitMQModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 10000, // 10 seconds
          limit: 10,  // 10 requests
        },
      ],
    }),
  ],
  controllers: [GamesController],
  providers: [
    // Global rate limiting guard (applied to all routes, can be overridden per route)
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    // Domain / Infrastructure services
    GameEventBus,
    GameLoopService,
    GameGateway,

    // Repository providers
    {
      provide: "IRoundRepository",
      useClass: PrismaRoundRepository,
    },
    {
      provide: "IBetRepository",
      useClass: PrismaBetRepository,
    },

    // Wallet event publisher
    {
      provide: "IWalletEventPublisher",
      useClass: WalletEventPublisher,
    },

    // Use cases
    PlaceBetUseCase,
    CashOutUseCase,
    GetCurrentRoundUseCase,
    GetRoundHistoryUseCase,
    GetMyBetsUseCase,
    GetLeaderboardUseCase,
    HandleWalletDebitResponseUseCase,
    HandleWalletCreditResponseUseCase,

    // Consumers (must be instantiated)
    WalletDebitResponseConsumer,
    WalletCreditResponseConsumer,
  ],
})
export class AppModule {}

import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./infrastructure/prisma/prisma.module";
import { RabbitMQModule } from "./infrastructure/rabbitmq/rabbitmq.module";
import { PrismaWalletRepository } from "./infrastructure/repositories/prisma-wallet.repository";
import { WalletsController } from "./presentation/controllers/wallets.controller";
import { JwtAuthGuard } from "./presentation/guards/jwt-auth.guard";
import { CreateWalletUseCase } from "./application/use-cases/create-wallet.use-case";
import { GetWalletUseCase } from "./application/use-cases/get-wallet.use-case";
import { DebitWalletUseCase } from "./application/use-cases/debit-wallet.use-case";
import { CreditWalletUseCase } from "./application/use-cases/credit-wallet.use-case";
import { WalletDebitRequestedConsumer } from "./infrastructure/rabbitmq/consumers/wallet-debit-requested.consumer";
import { WalletCreditRequestedConsumer } from "./infrastructure/rabbitmq/consumers/wallet-credit-requested.consumer";
import type { IWalletRepository } from "./domain/repositories/wallet.repository.interface";

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
  controllers: [WalletsController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    JwtAuthGuard,
    {
      provide: "IWalletRepository",
      useClass: PrismaWalletRepository,
    },
    {
      provide: CreateWalletUseCase,
      useFactory: (repo: IWalletRepository) => new CreateWalletUseCase(repo),
      inject: ["IWalletRepository"],
    },
    {
      provide: GetWalletUseCase,
      useFactory: (repo: IWalletRepository) => new GetWalletUseCase(repo),
      inject: ["IWalletRepository"],
    },
    {
      provide: DebitWalletUseCase,
      useFactory: (repo: IWalletRepository) => new DebitWalletUseCase(repo),
      inject: ["IWalletRepository"],
    },
    {
      provide: CreditWalletUseCase,
      useFactory: (repo: IWalletRepository) => new CreditWalletUseCase(repo),
      inject: ["IWalletRepository"],
    },
    WalletDebitRequestedConsumer,
    WalletCreditRequestedConsumer,
  ],
})
export class AppModule {}

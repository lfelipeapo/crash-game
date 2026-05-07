import { Module } from "@nestjs/common";
import { RabbitMQService } from "./rabbitmq.service";
import { WalletEventPublisher } from "./publishers/wallet-event.publisher";
import { GameEventBus } from "../game/game-event-bus.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [
    RabbitMQService,
    WalletEventPublisher,
    GameEventBus,
  ],
  exports: [RabbitMQService, WalletEventPublisher, GameEventBus],
})
export class RabbitMQModule {}

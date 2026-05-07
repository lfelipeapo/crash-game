import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "../rabbitmq.service";
import { HandleWalletDebitResponseUseCase } from "../../../application/use-cases/handle-wallet-debit-response.use-case";
import { GameEventBus } from "../../game/game-event-bus.service";
import type { WalletDebitSucceededEvent, WalletDebitFailedEvent } from "@crash/contracts";
import { randomUUID } from "crypto";

@Injectable()
export class WalletDebitResponseConsumer implements OnModuleInit {
  private readonly logger = new Logger(WalletDebitResponseConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly useCase: HandleWalletDebitResponseUseCase,
    private readonly eventBus: GameEventBus,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitmq.consume("wallet.debit.succeeded", async (msg) => {
      const content = JSON.parse(msg.content.toString()) as WalletDebitSucceededEvent;
      this.logger.log(`Received wallet.debit.succeeded for bet ${content.betId}`);

      const bet = await this.useCase.execute({
        type: "wallet.debit.succeeded",
        betId: content.betId,
        playerId: content.playerId,
        amountCents: content.amountCents,
      });

      if (bet) {
        // Emit bet.accepted event via GameEventBus for WebSocket broadcast
        this.eventBus.emit({
          eventId: randomUUID(),
          type: "bet.accepted",
          correlationId: content.correlationId,
          occurredAt: new Date().toISOString(),
          roundId: bet.roundId,
          betId: bet.id,
          playerId: bet.playerId,
          amountCents: bet.amountCents.toString(),
        });

        // Emit wallet balance update
        if (content.newBalanceCents) {
          this.eventBus.emit({
            eventId: randomUUID(),
            type: "wallet.balance.updated",
            correlationId: content.correlationId,
            occurredAt: new Date().toISOString(),
            playerId: content.playerId,
            balanceCents: content.newBalanceCents,
          });
        }
      }
    });

    await this.rabbitmq.consume("wallet.debit.failed", async (msg) => {
      const content = JSON.parse(msg.content.toString()) as WalletDebitFailedEvent;
      this.logger.warn(`Received wallet.debit.failed for bet ${content.betId}: ${content.reason}`);

      const bet = await this.useCase.execute({
        type: "wallet.debit.failed",
        betId: content.betId,
        playerId: content.playerId,
        amountCents: content.amountCents,
        reason: content.reason,
      });

      if (bet) {
        // Emit bet.rejected event via GameEventBus for WebSocket broadcast
        this.eventBus.emit({
          eventId: randomUUID(),
          type: "bet.rejected",
          correlationId: content.correlationId,
          occurredAt: new Date().toISOString(),
          roundId: bet.roundId,
          betId: bet.id,
          playerId: bet.playerId,
          amountCents: bet.amountCents.toString(),
          reason: content.reason,
        });
      }
    });
  }
}

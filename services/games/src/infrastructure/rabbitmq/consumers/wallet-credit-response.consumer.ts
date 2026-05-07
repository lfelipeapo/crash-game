import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "../rabbitmq.service";
import { HandleWalletCreditResponseUseCase } from "../../../application/use-cases/handle-wallet-credit-response.use-case";
import { GameEventBus } from "../../game/game-event-bus.service";
import type { WalletCreditSucceededEvent, WalletCreditFailedEvent } from "@crash/contracts";
import { randomUUID } from "crypto";

@Injectable()
export class WalletCreditResponseConsumer implements OnModuleInit {
  private readonly logger = new Logger(WalletCreditResponseConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly useCase: HandleWalletCreditResponseUseCase,
    private readonly eventBus: GameEventBus,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitmq.consume("wallet.credit.succeeded", async (msg) => {
      const content = JSON.parse(msg.content.toString()) as WalletCreditSucceededEvent;
      this.logger.log(`Received wallet.credit.succeeded for bet ${content.betId}`);

      const result = await this.useCase.execute({
        type: "wallet.credit.succeeded",
        betId: content.betId,
        playerId: content.playerId,
        amountCents: content.amountCents,
      });

      if (result) {
        // Emit bet.cashed_out event via GameEventBus for WebSocket broadcast
        this.eventBus.emit({
          eventId: randomUUID(),
          type: "bet.cashed_out",
          correlationId: content.correlationId,
          occurredAt: new Date().toISOString(),
          roundId: result.roundId,
          betId: result.betId,
          playerId: result.playerId,
          amountCents: result.amountCents.toString(),
          payoutCents: result.payoutCents.toString(),
          multiplierX100: result.multiplierX100,
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

    await this.rabbitmq.consume("wallet.credit.failed", async (msg) => {
      const content = JSON.parse(msg.content.toString()) as WalletCreditFailedEvent;
      this.logger.error(`Received wallet.credit.failed for bet ${content.betId}: ${content.reason}`);

      await this.useCase.execute({
        type: "wallet.credit.failed",
        betId: content.betId,
        playerId: content.playerId,
        amountCents: content.amountCents,
        reason: content.reason,
      });

      // Credit failure is logged but we don't emit a special event
      // The bet is already marked as cashed_out; wallet issue is a backend concern
    });
  }
}

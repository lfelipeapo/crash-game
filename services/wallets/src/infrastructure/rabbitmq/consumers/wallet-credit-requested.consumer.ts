import { Injectable, OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "../rabbitmq.service";
import { CreditWalletUseCase } from "../../../application/use-cases/credit-wallet.use-case";
import type {
  WalletCreditRequestedEvent,
  WalletCreditSucceededEvent,
  WalletCreditFailedEvent,
} from "@crash/contracts";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class WalletCreditRequestedConsumer implements OnModuleInit {
  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly creditWalletUseCase: CreditWalletUseCase,
  ) {}

  onModuleInit(): void {
    this.rabbitMQService.consume("wallet.credit.requested", async (msg) => {
      if (!msg) return;
      const event = JSON.parse(msg.content.toString()) as WalletCreditRequestedEvent;

      try {
        const result = await this.creditWalletUseCase.execute({
          playerId: event.playerId,
          amountCents: BigInt(event.amountCents),
          idempotencyKey: event.idempotencyKey,
          betId: event.betId,
        });

        const successEvent: WalletCreditSucceededEvent = {
          eventId: uuidv4(),
          type: "wallet.credit.succeeded",
          correlationId: event.correlationId,
          occurredAt: new Date().toISOString(),
          playerId: event.playerId,
          amountCents: result.transaction.amountCents.toString(),
          newBalanceCents: result.wallet.balanceCents.toString(),
          idempotencyKey: event.idempotencyKey,
          betId: event.betId,
        };

        this.rabbitMQService.publish("wallet.credit.succeeded", successEvent);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unknown error";
        const failedEvent: WalletCreditFailedEvent = {
          eventId: uuidv4(),
          type: "wallet.credit.failed",
          correlationId: event.correlationId,
          occurredAt: new Date().toISOString(),
          playerId: event.playerId,
          amountCents: event.amountCents,
          idempotencyKey: event.idempotencyKey,
          betId: event.betId,
          reason,
        };

        this.rabbitMQService.publish("wallet.credit.failed", failedEvent);
      }
    });
  }
}

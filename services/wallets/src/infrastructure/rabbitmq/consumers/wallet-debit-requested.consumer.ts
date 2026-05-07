import { Injectable, OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "../rabbitmq.service";
import { DebitWalletUseCase } from "../../../application/use-cases/debit-wallet.use-case";
import type {
  WalletDebitRequestedEvent,
  WalletDebitSucceededEvent,
  WalletDebitFailedEvent,
} from "@crash/contracts";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class WalletDebitRequestedConsumer implements OnModuleInit {
  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly debitWalletUseCase: DebitWalletUseCase,
  ) {}

  onModuleInit(): void {
    this.rabbitMQService.consume("wallet.debit.requested", async (msg) => {
      if (!msg) return;
      const event = JSON.parse(msg.content.toString()) as WalletDebitRequestedEvent;

      try {
        const result = await this.debitWalletUseCase.execute({
          playerId: event.playerId,
          amountCents: BigInt(event.amountCents),
          idempotencyKey: event.idempotencyKey,
          betId: event.betId,
        });

        const successEvent: WalletDebitSucceededEvent = {
          eventId: uuidv4(),
          type: "wallet.debit.succeeded",
          correlationId: event.correlationId,
          occurredAt: new Date().toISOString(),
          playerId: event.playerId,
          amountCents: result.transaction.amountCents.toString(),
          newBalanceCents: result.wallet.balanceCents.toString(),
          idempotencyKey: event.idempotencyKey,
          betId: event.betId,
        };

        this.rabbitMQService.publish("wallet.debit.succeeded", successEvent);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unknown error";
        const failedEvent: WalletDebitFailedEvent = {
          eventId: uuidv4(),
          type: "wallet.debit.failed",
          correlationId: event.correlationId,
          occurredAt: new Date().toISOString(),
          playerId: event.playerId,
          amountCents: event.amountCents,
          idempotencyKey: event.idempotencyKey,
          betId: event.betId,
          reason,
        };

        this.rabbitMQService.publish("wallet.debit.failed", failedEvent);
      }
    });
  }
}

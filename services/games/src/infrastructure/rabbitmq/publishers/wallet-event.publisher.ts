import { Injectable, Logger } from "@nestjs/common";
import { RabbitMQService } from "../rabbitmq.service";
import type {
  IWalletEventPublisher,
  WalletDebitRequest,
  WalletCreditRequest,
} from "../../../application/interfaces/wallet-event-publisher.interface";

@Injectable()
export class WalletEventPublisher implements IWalletEventPublisher {
  private readonly logger = new Logger(WalletEventPublisher.name);

  constructor(private readonly rabbitmq: RabbitMQService) {}

  async publishDebitRequested(request: WalletDebitRequest): Promise<void> {
    const event = {
      eventId: request.eventId,
      type: "wallet.debit.requested",
      correlationId: request.eventId,
      occurredAt: new Date().toISOString(),
      playerId: request.playerId,
      amountCents: request.amountCents.toString(),
      idempotencyKey: request.idempotencyKey,
      reason: "bet",
      betId: request.betId,
    };
    await this.rabbitmq.publish("wallet.debit.requested", event);
    this.logger.log(`Published wallet.debit.requested for bet ${request.betId}`);
  }

  async publishCreditRequested(request: WalletCreditRequest): Promise<void> {
    const event = {
      eventId: request.eventId,
      type: "wallet.credit.requested",
      correlationId: request.eventId,
      occurredAt: new Date().toISOString(),
      playerId: request.playerId,
      amountCents: request.amountCents.toString(),
      idempotencyKey: request.idempotencyKey,
      reason: "cashout",
      betId: request.betId,
    };
    await this.rabbitmq.publish("wallet.credit.requested", event);
    this.logger.log(`Published wallet.credit.requested for bet ${request.betId}`);
  }
}

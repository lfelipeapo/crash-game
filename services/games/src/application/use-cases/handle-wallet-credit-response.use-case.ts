import { Injectable, Logger, Inject } from "@nestjs/common";
import type { IBetRepository } from "../../domain/repositories/bet.repository.interface";

export interface WalletCreditResponse {
  type: "wallet.credit.succeeded" | "wallet.credit.failed";
  betId: string;
  playerId: string;
  amountCents: string;
  reason?: string;
}

@Injectable()
export class HandleWalletCreditResponseUseCase {
  private readonly logger = new Logger(HandleWalletCreditResponseUseCase.name);

  constructor(
    @Inject("IBetRepository")
    private readonly betRepo: IBetRepository,
  ) {}

  async execute(event: WalletCreditResponse): Promise<void> {
    const bet = await this.betRepo.findById(event.betId);
    if (!bet) {
      this.logger.warn(`Bet not found for credit response: ${event.betId}`);
      return;
    }

    if (event.type === "wallet.credit.succeeded") {
      this.logger.log(`Credit succeeded for bet: ${bet.id}, payout: ${event.amountCents}`);
    } else {
      this.logger.error(`Credit failed for bet: ${bet.id}, reason: ${event.reason ?? "unknown"}`);
      // In production, this would trigger an alert/manual reconciliation
    }
  }
}

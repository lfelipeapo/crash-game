import { Injectable, Logger, Inject } from "@nestjs/common";
import type { IBetRepository } from "../../domain/repositories/bet.repository.interface";
import { Bet } from "../../domain/entities/bet.entity";

export interface WalletDebitResponse {
  type: "wallet.debit.succeeded" | "wallet.debit.failed";
  betId: string;
  playerId: string;
  amountCents: string;
  reason?: string;
}

@Injectable()
export class HandleWalletDebitResponseUseCase {
  private readonly logger = new Logger(HandleWalletDebitResponseUseCase.name);

  constructor(
    @Inject("IBetRepository")
    private readonly betRepo: IBetRepository,
  ) {}

  async execute(event: WalletDebitResponse): Promise<Bet | null> {
    const bet = await this.betRepo.findById(event.betId);
    if (!bet) {
      this.logger.warn(`Bet not found for debit response: ${event.betId}`);
      return null;
    }

    if (event.type === "wallet.debit.succeeded") {
      bet.accept();
      this.logger.log(`Bet accepted: ${bet.id}`);
    } else {
      bet.reject();
      this.logger.warn(`Bet rejected: ${bet.id}, reason: ${event.reason ?? "unknown"}`);
    }

    await this.betRepo.save(bet);
    return bet;
  }
}

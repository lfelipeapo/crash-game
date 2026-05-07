import { Injectable, Logger, BadRequestException, Inject } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { IRoundRepository } from "../../domain/repositories/round.repository.interface";
import type { IBetRepository } from "../../domain/repositories/bet.repository.interface";
import type { IWalletEventPublisher, WalletCreditRequest } from "../interfaces/wallet-event-publisher.interface";

export interface CashOutInput {
  playerId: string;
}

export interface CashOutOutput {
  betId: string;
  roundId: string;
  payoutCents: bigint;
  multiplierX100: number;
}

@Injectable()
export class CashOutUseCase {
  private readonly logger = new Logger(CashOutUseCase.name);

  constructor(
    @Inject("IRoundRepository")
    private readonly roundRepo: IRoundRepository,
    @Inject("IBetRepository")
    private readonly betRepo: IBetRepository,
    @Inject("IWalletEventPublisher")
    private readonly walletPublisher: IWalletEventPublisher,
  ) {}

  async execute(input: CashOutInput): Promise<CashOutOutput> {
    const currentRound = await this.roundRepo.findCurrent();
    if (!currentRound) {
      throw new BadRequestException("No active round");
    }

    if (!currentRound.canCashOut()) {
      throw new BadRequestException("Round is not running");
    }

    const bet = await this.betRepo.findByRoundAndPlayer(currentRound.id, input.playerId);
    if (!bet) {
      throw new BadRequestException("No bet found for this round");
    }

    if (bet.state !== "accepted") {
      throw new BadRequestException(`Bet cannot be cashed out from state: ${bet.state}`);
    }

    const startedAt = currentRound.startedAt;
    if (!startedAt) {
      throw new BadRequestException("Round has not started");
    }

    const elapsedMs = Date.now() - startedAt.getTime();
    const multiplierX100 = currentRound.getCurrentMultiplierX100(elapsedMs);

    // Check if crash point has already been reached
    const crashPoint = currentRound.crashPointX100;
    if (crashPoint !== null && multiplierX100 >= crashPoint) {
      throw new BadRequestException("Round has already crashed");
    }

    const payoutCents = bet.cashOut(multiplierX100);
    await this.betRepo.save(bet);

    const request: WalletCreditRequest = {
      eventId: randomUUID(),
      playerId: input.playerId,
      amountCents: payoutCents,
      idempotencyKey: `cashout-${bet.id}`,
      betId: bet.id,
    };

    await this.walletPublisher.publishCreditRequested(request);

    this.logger.log(`Cashout: ${bet.id} player ${input.playerId} at ${multiplierX100}x, payout ${payoutCents}`);

    return {
      betId: bet.id,
      roundId: currentRound.id,
      payoutCents,
      multiplierX100,
    };
  }
}

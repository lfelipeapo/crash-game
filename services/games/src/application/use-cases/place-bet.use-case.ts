import { Injectable, Logger, BadRequestException, Inject } from "@nestjs/common";
import { randomUUID } from "crypto";
import { validateBetAmountCents } from "@crash/contracts";
import type { IRoundRepository } from "../../domain/repositories/round.repository.interface";
import type { IBetRepository } from "../../domain/repositories/bet.repository.interface";
import type { IWalletEventPublisher, WalletDebitRequest } from "../interfaces/wallet-event-publisher.interface";
import { Bet } from "../../domain/entities/bet.entity";

export interface PlaceBetInput {
  playerId: string;
  playerUsername: string;
  amountCents: bigint;
  autoCashoutMultiplierX100?: number;
}

export interface PlaceBetOutput {
  betId: string;
  roundId: string;
  state: string;
  amountCents: bigint;
}

@Injectable()
export class PlaceBetUseCase {
  private readonly logger = new Logger(PlaceBetUseCase.name);

  constructor(
    @Inject("IRoundRepository")
    private readonly roundRepo: IRoundRepository,
    @Inject("IBetRepository")
    private readonly betRepo: IBetRepository,
    @Inject("IWalletEventPublisher")
    private readonly walletPublisher: IWalletEventPublisher,
  ) {}

  async execute(input: PlaceBetInput): Promise<PlaceBetOutput> {
    const validation = validateBetAmountCents(input.amountCents);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    const currentRound = await this.roundRepo.findCurrent();
    if (!currentRound) {
      throw new BadRequestException("No active round");
    }

    if (!currentRound.canBet()) {
      throw new BadRequestException("Betting is closed for this round");
    }

    const existingBet = await this.betRepo.findByRoundAndPlayer(currentRound.id, input.playerId);
    if (existingBet) {
      throw new BadRequestException("You already placed a bet in this round");
    }

    // Validate auto cashout if provided
    if (input.autoCashoutMultiplierX100 !== undefined) {
      if (input.autoCashoutMultiplierX100 < 100) {
        throw new BadRequestException("Auto cashout must be at least 1.00x");
      }
      if (input.autoCashoutMultiplierX100 > 100000) {
        throw new BadRequestException("Auto cashout exceeds maximum allowed");
      }
    }

    const bet = Bet.create(
      currentRound.id,
      input.playerId,
      input.playerUsername,
      input.amountCents,
      input.autoCashoutMultiplierX100,
    );

    await this.betRepo.create(bet);

    const request: WalletDebitRequest = {
      eventId: randomUUID(),
      playerId: input.playerId,
      amountCents: input.amountCents,
      idempotencyKey: bet.id,
      betId: bet.id,
    };

    await this.walletPublisher.publishDebitRequested(request);

    this.logger.log(`Bet placed: ${bet.id} for player ${input.playerId}, amount ${input.amountCents}${input.autoCashoutMultiplierX100 ? `, autoCashout ${input.autoCashoutMultiplierX100 / 100}x` : ""}`);

    return {
      betId: bet.id,
      roundId: currentRound.id,
      state: bet.state,
      amountCents: bet.amountCents,
    };
  }
}

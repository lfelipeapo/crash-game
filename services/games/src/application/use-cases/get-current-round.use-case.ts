import { Injectable, Logger, Inject } from "@nestjs/common";
import type { IRoundRepository } from "../../domain/repositories/round.repository.interface";
import type { IBetRepository } from "../../domain/repositories/bet.repository.interface";
import type { RoundWithBetsResponseDto, BetResponseDto, RoundResponseDto } from "@crash/contracts";

@Injectable()
export class GetCurrentRoundUseCase {
  private readonly logger = new Logger(GetCurrentRoundUseCase.name);

  constructor(
    @Inject("IRoundRepository")
    private readonly roundRepo: IRoundRepository,
    @Inject("IBetRepository")
    private readonly betRepo: IBetRepository,
  ) {}

  async execute(): Promise<RoundWithBetsResponseDto | null> {
    const round = await this.roundRepo.findCurrent();
    if (!round) {
      return null;
    }

    const bets = await this.betRepo.findByRound(round.id);
    const roundDto: RoundResponseDto = this.mapRound(round);
    const betsDto: BetResponseDto[] = bets.map(b => this.mapBet(b));

    return {
      ...roundDto,
      bets: betsDto,
    };
  }

  private mapRound(r: any): RoundResponseDto {
    const isRevealed = r.state === "crashed" || r.state === "settled";
    return {
      id: r.id,
      state: r.state,
      serverSeedHash: r.serverSeedHash,
      serverSeed: isRevealed ? r.serverSeed : null,
      crashPointX100: isRevealed ? r.crashPointX100 : null,
      multiplierX100: r.multiplierX100,
      startedAt: r.startedAt ? r.startedAt.toISOString() : null,
      crashedAt: r.crashedAt ? r.crashedAt.toISOString() : null,
      settledAt: r.settledAt ? r.settledAt.toISOString() : null,
      bettingEndsAt: r.bettingEndsAt ? r.bettingEndsAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    };
  }

  private mapBet(b: any): BetResponseDto {
    return {
      id: b.id,
      roundId: b.roundId,
      playerId: b.playerId,
      playerUsername: b.playerUsername,
      amountCents: b.amountCents.toString(),
      payoutCents: b.payoutCents !== null ? b.payoutCents.toString() : null,
      multiplierX100: b.multiplierX100,
      state: b.state,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    };
  }
}

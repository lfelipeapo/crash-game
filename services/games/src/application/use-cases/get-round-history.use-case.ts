import { Injectable, Logger, Inject } from "@nestjs/common";
import type { IRoundRepository } from "../../domain/repositories/round.repository.interface";
import type { RoundHistoryResponseDto, RoundResponseDto } from "@crash/contracts";

@Injectable()
export class GetRoundHistoryUseCase {
  private readonly logger = new Logger(GetRoundHistoryUseCase.name);

  constructor(
    @Inject("IRoundRepository")
    private readonly roundRepo: IRoundRepository,
  ) {}

  async execute(limit: number, offset: number): Promise<RoundHistoryResponseDto> {
    const { rounds, total } = await this.roundRepo.findHistory(limit, offset);

    const roundDtos: RoundResponseDto[] = rounds.map(r => ({
      id: r.id,
      state: r.state,
      serverSeedHash: r.serverSeedHash,
      serverSeed: r.serverSeed,
      crashPointX100: r.crashPointX100,
      multiplierX100: r.multiplierX100,
      startedAt: r.startedAt ? r.startedAt.toISOString() : null,
      crashedAt: r.crashedAt ? r.crashedAt.toISOString() : null,
      settledAt: r.settledAt ? r.settledAt.toISOString() : null,
      bettingEndsAt: r.bettingEndsAt ? r.bettingEndsAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      rounds: roundDtos,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
    };
  }
}

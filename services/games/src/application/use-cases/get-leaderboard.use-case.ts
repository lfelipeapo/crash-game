import { Injectable, Logger, Inject } from "@nestjs/common";
import type { IBetRepository } from "../../domain/repositories/bet.repository.interface";
import type { LeaderboardResponseDto, LeaderboardEntryDto } from "@crash/contracts";

@Injectable()
export class GetLeaderboardUseCase {
  private readonly logger = new Logger(GetLeaderboardUseCase.name);

  constructor(
    @Inject("IBetRepository")
    private readonly betRepo: IBetRepository,
  ) {}

  async execute(period: string): Promise<LeaderboardResponseDto> {
    const periodHours = period === "7d" ? 24 * 7 : 24; // default 24h
    const entries = await this.betRepo.getLeaderboard(periodHours, 10);

    return {
      period: period === "7d" ? "7d" : "24h",
      entries,
    };
  }
}

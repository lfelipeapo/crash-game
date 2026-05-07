import { Injectable, Logger, Inject } from "@nestjs/common";
import type { IBetRepository } from "../../domain/repositories/bet.repository.interface";
import type { MyBetsResponseDto, BetResponseDto } from "@crash/contracts";

@Injectable()
export class GetMyBetsUseCase {
  private readonly logger = new Logger(GetMyBetsUseCase.name);

  constructor(
    @Inject("IBetRepository")
    private readonly betRepo: IBetRepository,
  ) {}

  async execute(playerId: string, limit: number, offset: number): Promise<MyBetsResponseDto> {
    const { bets, total } = await this.betRepo.findByPlayer(playerId, limit, offset);

    const betDtos: BetResponseDto[] = bets.map(b => ({
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
    }));

    return {
      bets: betDtos,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
    };
  }
}

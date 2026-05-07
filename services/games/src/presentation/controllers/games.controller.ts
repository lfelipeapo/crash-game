import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import type {
  PlaceBetRequestDto,
  PlaceBetResponseDto,
  CashOutResponseDto,
  RoundWithBetsResponseDto,
  RoundHistoryResponseDto,
  ProvablyFairVerifyResponseDto,
  MyBetsResponseDto,
  LeaderboardResponseDto,
} from "@crash/contracts";
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import type { UserContext } from "../guards/jwt-auth.guard";
import { CurrentUser } from "../decorators/current-user.decorator";
import { PlaceBetUseCase } from "../../application/use-cases/place-bet.use-case";
import { CashOutUseCase } from "../../application/use-cases/cash-out.use-case";
import { GetCurrentRoundUseCase } from "../../application/use-cases/get-current-round.use-case";
import { GetRoundHistoryUseCase } from "../../application/use-cases/get-round-history.use-case";
import { GetMyBetsUseCase } from "../../application/use-cases/get-my-bets.use-case";
import { GetLeaderboardUseCase } from "../../application/use-cases/get-leaderboard.use-case";
import type { IRoundRepository } from "../../domain/repositories/round.repository.interface";
import { ProvablyFairService } from "../../domain/services/provably-fair.service";

@ApiTags("Games")
@Controller()
export class GamesController {
  constructor(
    private readonly placeBetUseCase: PlaceBetUseCase,
    private readonly cashOutUseCase: CashOutUseCase,
    private readonly getCurrentRoundUseCase: GetCurrentRoundUseCase,
    private readonly getRoundHistoryUseCase: GetRoundHistoryUseCase,
    private readonly getMyBetsUseCase: GetMyBetsUseCase,
    private readonly getLeaderboardUseCase: GetLeaderboardUseCase,
    @Inject("IRoundRepository")
    private readonly roundRepo: IRoundRepository,
  ) {}

  @Get("health")
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "games" };
  }

  @Get("rounds/current")
  async getCurrentRound(): Promise<RoundWithBetsResponseDto | { message: string }> {
    const result = await this.getCurrentRoundUseCase.execute();
    if (!result) {
      return { message: "No active round" };
    }
    return result;
  }

  @Get("rounds/history")
  async getRoundHistory(
    @Query("limit") limitStr: string,
    @Query("offset") offsetStr: string,
  ): Promise<RoundHistoryResponseDto> {
    const limit = Math.min(parseInt(limitStr ?? "20", 10) || 20, 100);
    const offset = parseInt(offsetStr ?? "0", 10) || 0;
    return this.getRoundHistoryUseCase.execute(limit, offset);
  }

  @Get("rounds/:roundId/verify")
  async verifyRound(
    @Param("roundId") roundId: string,
  ): Promise<ProvablyFairVerifyResponseDto> {
    const round = await this.roundRepo.findById(roundId);
    if (!round) {
      throw new BadRequestException("Round not found");
    }
    if (!round.serverSeed) {
      throw new BadRequestException("Server seed not yet revealed");
    }

    const provablyFair = new ProvablyFairService();
    const hmac = provablyFair.calculateHmac(
      round.serverSeed,
      round.clientSeed,
      round.nonce,
    );
    const crashPointX100 = provablyFair.calculateCrashPointX100(
      round.serverSeed,
      round.clientSeed,
      round.nonce,
    );

    return {
      roundId: round.id,
      serverSeed: round.serverSeed,
      serverSeedHash: round.serverSeedHash,
      clientSeed: round.clientSeed,
      nonce: round.nonce,
      hmac,
      crashPointX100,
      algorithm: "HMAC_SHA256_SHA256_COMMITMENT_V1",
      houseEdge: 0.03,
    };
  }

  @Get("bets/me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getMyBets(
    @CurrentUser() user: UserContext,
    @Query("limit") limitStr: string,
    @Query("offset") offsetStr: string,
  ): Promise<MyBetsResponseDto> {
    const limit = Math.min(parseInt(limitStr ?? "20", 10) || 20, 100);
    const offset = parseInt(offsetStr ?? "0", 10) || 0;
    return this.getMyBetsUseCase.execute(user.playerId, limit, offset);
  }

  @Post("bet")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async placeBet(
    @Body() dto: PlaceBetRequestDto,
    @CurrentUser() user: UserContext,
  ): Promise<PlaceBetResponseDto> {
    const amountCents = BigInt(dto.amountCents);
    const result = await this.placeBetUseCase.execute({
      playerId: user.playerId,
      playerUsername: user.username,
      amountCents,
      autoCashoutMultiplierX100: dto.autoCashoutMultiplierX100,
    });

    return {
      betId: result.betId,
      roundId: result.roundId,
      status: result.state as any,
      amountCents: result.amountCents.toString(),
    };
  }

  @Post("bet/cashout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async cashOut(
    @CurrentUser() user: UserContext,
  ): Promise<CashOutResponseDto> {
    const result = await this.cashOutUseCase.execute({
      playerId: user.playerId,
    });

    return {
      betId: result.betId,
      roundId: result.roundId,
      payoutCents: result.payoutCents.toString(),
      multiplierX100: result.multiplierX100,
    };
  }

  @Get("leaderboard")
  async getLeaderboard(
    @Query("period") period: string,
  ): Promise<LeaderboardResponseDto> {
    const validPeriod = period === "7d" ? "7d" : "24h";
    return this.getLeaderboardUseCase.execute(validPeriod);
  }
}

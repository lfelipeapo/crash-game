import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { IBetRepository } from "../../domain/repositories/bet.repository.interface";
import { Bet } from "../../domain/entities/bet.entity";
import { BetState } from "@crash/contracts";
import type { LeaderboardEntryDto } from "@crash/contracts";

@Injectable()
export class PrismaBetRepository implements IBetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(bet: Bet): Promise<void> {
    const data = bet.toJSON();
    await this.prisma.bet.create({
      data: {
        id: data.id,
        roundId: data.roundId,
        playerId: data.playerId,
        playerUsername: data.playerUsername,
        amountCents: data.amountCents,
        payoutCents: data.payoutCents,
        multiplierX100: data.multiplierX100,
        autoCashoutMultiplierX100: data.autoCashoutMultiplierX100,
        state: data.state,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<Bet | null> {
    const row = await this.prisma.bet.findUnique({ where: { id } });
    if (!row) return null;
    return this.mapToEntity(row);
  }

  async findByRoundAndPlayer(roundId: string, playerId: string): Promise<Bet | null> {
    const row = await this.prisma.bet.findFirst({
      where: { roundId, playerId },
    });
    if (!row) return null;
    return this.mapToEntity(row);
  }

  async findByRound(roundId: string): Promise<Bet[]> {
    const rows = await this.prisma.bet.findMany({
      where: { roundId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async findByPlayer(playerId: string, limit: number, offset: number): Promise<{ bets: Bet[]; total: number }> {
    const [rows, total] = await Promise.all([
      this.prisma.bet.findMany({
        where: { playerId },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      this.prisma.bet.count({ where: { playerId } }),
    ]);

    return {
      bets: rows.map(r => this.mapToEntity(r)),
      total,
    };
  }

  async findAcceptedByRound(roundId: string): Promise<Bet[]> {
    const rows = await this.prisma.bet.findMany({
      where: { roundId, state: BetState.ACCEPTED },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async getLeaderboard(periodHours: number, limit: number): Promise<LeaderboardEntryDto[]> {
    const since = new Date(Date.now() - periodHours * 60 * 60 * 1000);
    const rows = await this.prisma.$queryRaw<Array<{
      playerId: string;
      playerUsername: string;
      totalProfitCents: bigint;
      totalBets: bigint;
      totalCashouts: bigint;
    }>>`
      SELECT
        "playerId",
        "playerUsername",
        COALESCE(SUM(COALESCE("payoutCents", 0) - "amountCents"), 0) as "totalProfitCents",
        COUNT(*) as "totalBets",
        COUNT(*) as "totalCashouts"
      FROM bets
      WHERE "createdAt" >= ${since} AND state = 'cashed_out'
      GROUP BY "playerId", "playerUsername"
      ORDER BY "totalProfitCents" DESC
      LIMIT ${limit}
    `;

    return rows.map(r => ({
      playerId: r.playerId,
      playerUsername: r.playerUsername,
      totalProfitCents: r.totalProfitCents.toString(),
      totalBets: Number(r.totalBets),
      totalCashouts: Number(r.totalCashouts),
    }));
  }

  async save(bet: Bet): Promise<void> {
    const data = bet.toJSON();
    await this.prisma.bet.update({
      where: { id: data.id },
      data: {
        payoutCents: data.payoutCents,
        multiplierX100: data.multiplierX100,
        autoCashoutMultiplierX100: data.autoCashoutMultiplierX100,
        state: data.state,
        updatedAt: data.updatedAt,
      },
    });
  }

  private mapToEntity(row: any): Bet {
    return Bet.reconstitute({
      id: row.id,
      roundId: row.roundId,
      playerId: row.playerId,
      playerUsername: row.playerUsername,
      amountCents: row.amountCents,
      payoutCents: row.payoutCents,
      multiplierX100: row.multiplierX100,
      autoCashoutMultiplierX100: row.autoCashoutMultiplierX100,
      state: row.state as BetState,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}

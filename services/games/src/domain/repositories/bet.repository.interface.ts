import { Bet } from "../entities/bet.entity";
import type { LeaderboardEntryDto } from "@crash/contracts";

export interface IBetRepository {
  create(bet: Bet): Promise<void>;
  findById(id: string): Promise<Bet | null>;
  findByRoundAndPlayer(roundId: string, playerId: string): Promise<Bet | null>;
  findByRound(roundId: string): Promise<Bet[]>;
  findAcceptedByRound(roundId: string): Promise<Bet[]>;
  findByPlayer(playerId: string, limit: number, offset: number): Promise<{ bets: Bet[]; total: number }>;
  getLeaderboard(periodHours: number, limit: number): Promise<LeaderboardEntryDto[]>;
  save(bet: Bet): Promise<void>;
}

import type { BetState, RoundState } from "./enums";

// Wallet DTOs
export interface CreateWalletRequestDto {
  // No body needed - playerId from JWT
}

export interface WalletResponseDto {
  id: string;
  playerId: string;
  balanceCents: string;
  createdAt: string;
  updatedAt: string;
}

// Game DTOs
export interface PlaceBetRequestDto {
  amountCents: string; // bigint as string
  autoCashoutMultiplierX100?: number; // e.g. 150 = 1.50x auto cashout
}

export interface PlaceBetResponseDto {
  betId: string;
  roundId: string;
  status: BetState;
  amountCents: string;
}

export interface CashOutRequestDto {
  // No body needed - playerId from JWT
}

export interface CashOutResponseDto {
  betId: string;
  roundId: string;
  payoutCents: string;
  multiplierX100: number;
}

export interface RoundResponseDto {
  id: string;
  state: RoundState;
  serverSeedHash: string | null;
  serverSeed: string | null;
  crashPointX100: number | null;
  multiplierX100: number;
  startedAt: string | null;
  crashedAt: string | null;
  settledAt: string | null;
  bettingEndsAt: string | null;
  createdAt: string;
}

export interface RoundWithBetsResponseDto extends RoundResponseDto {
  bets: BetResponseDto[];
}

export interface BetResponseDto {
  id: string;
  roundId: string;
  playerId: string;
  playerUsername: string;
  amountCents: string;
  payoutCents: string | null;
  multiplierX100: number | null;
  state: BetState;
  createdAt: string;
  updatedAt: string;
}

export interface ProvablyFairVerifyResponseDto {
  roundId: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  hmac: string;
  crashPointX100: number;
  algorithm: string;
  houseEdge: number;
}

export interface RoundHistoryResponseDto {
  rounds: RoundResponseDto[];
  total: number;
  page: number;
  limit: number;
}

export interface MyBetsResponseDto {
  bets: BetResponseDto[];
  total: number;
  page: number;
  limit: number;
}

export interface LeaderboardEntryDto {
  playerId: string;
  playerUsername: string;
  totalProfitCents: string;
  totalBets: number;
  totalCashouts: number;
}

export interface LeaderboardResponseDto {
  period: string;
  entries: LeaderboardEntryDto[];
}

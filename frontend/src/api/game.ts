import type {
  RoundWithBetsResponseDto,
  RoundHistoryResponseDto,
  MyBetsResponseDto,
  PlaceBetRequestDto,
  PlaceBetResponseDto,
  CashOutResponseDto,
  ProvablyFairVerifyResponseDto,
} from "@crash/contracts";
import { apiFetch } from "./client";

export async function getCurrentRound(): Promise<RoundWithBetsResponseDto | { message: string }> {
  return apiFetch<RoundWithBetsResponseDto | { message: string }>("/games/rounds/current");
}

export async function getRoundHistory(
  page = 0,
  limit = 20
): Promise<RoundHistoryResponseDto> {
  return apiFetch<RoundHistoryResponseDto>(
    `/games/rounds/history?limit=${limit}&offset=${page * limit}`
  );
}

export async function verifyRound(roundId: string): Promise<ProvablyFairVerifyResponseDto> {
  return apiFetch<ProvablyFairVerifyResponseDto>(`/games/rounds/${roundId}/verify`);
}

export async function getMyBets(
  page = 0,
  limit = 20
): Promise<MyBetsResponseDto> {
  return apiFetch<MyBetsResponseDto>(
    `/games/bets/me?limit=${limit}&offset=${page * limit}`
  );
}

export async function placeBet(
  amountCents: bigint,
  autoCashoutMultiplierX100?: number,
): Promise<PlaceBetResponseDto> {
  const dto: PlaceBetRequestDto = {
    amountCents: amountCents.toString(),
    ...(autoCashoutMultiplierX100 != null && { autoCashoutMultiplierX100 }),
  };
  return apiFetch<PlaceBetResponseDto>("/games/bet", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function cashOut(): Promise<CashOutResponseDto> {
  return apiFetch<CashOutResponseDto>("/games/bet/cashout", {
    method: "POST",
  });
}

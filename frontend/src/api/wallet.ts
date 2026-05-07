import type { WalletResponseDto } from "@crash/contracts";
import { apiFetch } from "./client";

export async function createWallet(): Promise<WalletResponseDto> {
  return apiFetch<WalletResponseDto>("/wallets", { method: "POST" });
}

export async function getMyWallet(): Promise<WalletResponseDto> {
  return apiFetch<WalletResponseDto>("/wallets/me");
}

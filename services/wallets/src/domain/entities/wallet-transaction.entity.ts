export type TransactionType = "debit" | "credit";
export type TransactionReason = "bet" | "cashout";

export class WalletTransaction {
  constructor(
    public readonly id: string,
    public readonly walletId: string,
    public readonly type: TransactionType,
    public readonly amountCents: bigint,
    public readonly idempotencyKey: string,
    public readonly reason: TransactionReason,
    public readonly betId: string | null,
    public readonly createdAt: Date,
  ) {}
}

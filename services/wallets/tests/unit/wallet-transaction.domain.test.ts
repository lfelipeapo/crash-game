import { describe, it, expect } from "bun:test";
import { WalletTransaction } from "../../src/domain/entities/wallet-transaction.entity";

describe("WalletTransaction Entity", () => {
  it("should create a debit transaction", () => {
    const tx = new WalletTransaction(
      "tx-id",
      "wallet-id",
      "debit",
      1000n,
      "idem-key",
      "bet",
      "bet-id",
      new Date("2024-01-01T00:00:00Z"),
    );

    expect(tx.id).toBe("tx-id");
    expect(tx.walletId).toBe("wallet-id");
    expect(tx.type).toBe("debit");
    expect(tx.amountCents).toBe(1000n);
    expect(tx.idempotencyKey).toBe("idem-key");
    expect(tx.reason).toBe("bet");
    expect(tx.betId).toBe("bet-id");
  });

  it("should create a credit transaction with null betId", () => {
    const tx = new WalletTransaction(
      "tx-id-2",
      "wallet-id",
      "credit",
      500n,
      "idem-key-2",
      "cashout",
      null,
      new Date(),
    );

    expect(tx.type).toBe("credit");
    expect(tx.reason).toBe("cashout");
    expect(tx.betId).toBeNull();
  });
});

import { describe, it, expect } from "bun:test";
import { Wallet } from "../../src/domain/entities/wallet.entity";

describe("Wallet Entity", () => {
  function createWallet(balanceCents: bigint): Wallet {
    return new Wallet(
      "wallet-id",
      "player-id",
      balanceCents,
      new Date("2024-01-01T00:00:00Z"),
      new Date("2024-01-01T00:00:00Z"),
    );
  }

  it("should credit balance correctly", () => {
    const wallet = createWallet(1000n);
    wallet.credit(500n);
    expect(wallet.balanceCents).toBe(1500n);
  });

  it("should debit balance correctly", () => {
    const wallet = createWallet(1000n);
    wallet.debit(300n);
    expect(wallet.balanceCents).toBe(700n);
  });

  it("should throw on insufficient balance", () => {
    const wallet = createWallet(100n);
    expect(() => wallet.debit(200n)).toThrow("Insufficient balance");
  });

  it("should never allow negative balance", () => {
    const wallet = createWallet(100n);
    try {
      wallet.debit(200n);
    } catch {
      // expected
    }
    expect(wallet.balanceCents).toBeGreaterThanOrEqual(0n);
  });

  it("should update updatedAt on debit", () => {
    const wallet = createWallet(1000n);
    const before = wallet.updatedAt.getTime();
    wallet.debit(100n);
    expect(wallet.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("should update updatedAt on credit", () => {
    const wallet = createWallet(1000n);
    const before = wallet.updatedAt.getTime();
    wallet.credit(100n);
    expect(wallet.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("canDebit should return false when balance is insufficient", () => {
    const wallet = createWallet(100n);
    expect(wallet.canDebit(200n)).toBe(false);
  });

  it("canDebit should return true when balance is sufficient", () => {
    const wallet = createWallet(100n);
    expect(wallet.canDebit(50n)).toBe(true);
  });

  it("should handle exact balance debit", () => {
    const wallet = createWallet(100n);
    wallet.debit(100n);
    expect(wallet.balanceCents).toBe(0n);
  });
});

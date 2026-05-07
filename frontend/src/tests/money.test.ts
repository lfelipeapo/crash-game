import { describe, it, expect } from "bun:test";
import {
  formatMoneyCents,
  parseMoneyCents,
  calculatePayoutCents,
  validateBetAmountCents,
  MIN_BET_CENTS,
  MAX_BET_CENTS,
} from "@crash/contracts";

describe("money utils", () => {
  it("formats cents to dollars", () => {
    expect(formatMoneyCents(100n)).toBe("1.00");
    expect(formatMoneyCents(1234n)).toBe("12.34");
    expect(formatMoneyCents(100000n)).toBe("1,000.00");
    expect(formatMoneyCents(0n)).toBe("0.00");
  });

  it("parses money string to cents", () => {
    expect(parseMoneyCents("1.00")).toBe(100n);
    expect(parseMoneyCents("12.34")).toBe(1234n);
    expect(parseMoneyCents("1,000.00")).toBe(100000n);
    expect(parseMoneyCents("5")).toBe(500n);
    expect(parseMoneyCents("0.5")).toBe(50n);
  });

  it("calculates payout correctly", () => {
    expect(calculatePayoutCents(100n, 150)).toBe(150n);
    expect(calculatePayoutCents(1000n, 237)).toBe(2370n);
  });

  it("validates bet amounts", () => {
    expect(validateBetAmountCents(50n).valid).toBe(false);
    expect(validateBetAmountCents(MIN_BET_CENTS).valid).toBe(true);
    expect(validateBetAmountCents(MAX_BET_CENTS).valid).toBe(true);
    expect(validateBetAmountCents(MAX_BET_CENTS + 1n).valid).toBe(false);
  });
});

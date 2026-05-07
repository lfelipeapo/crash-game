import { describe, expect, test } from "bun:test";
import {
  calculatePayoutCents,
  formatMoneyCents,
  parseMoneyCents,
  validateBetAmountCents,
  MIN_BET_CENTS,
  MAX_BET_CENTS,
} from "../src/money";

describe("calculatePayoutCents", () => {
  test("returns correct payout for 1x multiplier", () => {
    const result = calculatePayoutCents(500n, 100);
    expect(result).toBe(500n);
  });

  test("returns correct payout for 2x multiplier", () => {
    const result = calculatePayoutCents(500n, 200);
    expect(result).toBe(1000n);
  });

  test("returns correct payout for fractional multiplier (1.5x)", () => {
    const result = calculatePayoutCents(1000n, 150);
    expect(result).toBe(1500n);
  });

  test("rounds down on uneven division", () => {
    // 100 cents * 133 / 100 = 133 cents exactly
    const result = calculatePayoutCents(100n, 133);
    expect(result).toBe(133n);
  });

  test("handles large numbers", () => {
    const result = calculatePayoutCents(100_000n, 500);
    expect(result).toBe(500_000n);
  });

  test("returns zero for zero bet", () => {
    const result = calculatePayoutCents(0n, 200);
    expect(result).toBe(0n);
  });
});

describe("formatMoneyCents", () => {
  test("formats cents to dollars with 2 decimals", () => {
    expect(formatMoneyCents(500n)).toBe("5.00");
  });

  test("formats large amounts with commas", () => {
    expect(formatMoneyCents(1_234_567n)).toBe("12,345.67");
  });

  test("formats zero cents", () => {
    expect(formatMoneyCents(0n)).toBe("0.00");
  });

  test("formats single cent correctly", () => {
    expect(formatMoneyCents(1n)).toBe("0.01");
  });

  test("formats max bet correctly", () => {
    expect(formatMoneyCents(MAX_BET_CENTS)).toBe("1,000.00");
  });
});

describe("parseMoneyCents", () => {
  test("parses dollar amount without cents", () => {
    expect(parseMoneyCents("5")).toBe(500n);
  });

  test("parses dollar amount with cents", () => {
    expect(parseMoneyCents("5.50")).toBe(550n);
  });

  test("parses amount with dollar sign", () => {
    expect(parseMoneyCents("$10.00")).toBe(1000n);
  });

  test("parses amount with commas", () => {
    expect(parseMoneyCents("$1,234.56")).toBe(123456n);
  });

  test("parses zero", () => {
    expect(parseMoneyCents("0")).toBe(0n);
  });

  test("parses empty string as zero", () => {
    expect(parseMoneyCents("")).toBe(0n);
  });

  test("truncates extra decimal places to 2", () => {
    expect(parseMoneyCents("5.555")).toBe(555n);
  });

  test("pads single decimal digit", () => {
    expect(parseMoneyCents("5.5")).toBe(550n);
  });
});

describe("validateBetAmountCents", () => {
  test("accepts minimum bet", () => {
    const result = validateBetAmountCents(MIN_BET_CENTS);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test("accepts maximum bet", () => {
    const result = validateBetAmountCents(MAX_BET_CENTS);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test("accepts bet within range", () => {
    const result = validateBetAmountCents(5000n);
    expect(result.valid).toBe(true);
  });

  test("rejects bet below minimum", () => {
    const result = validateBetAmountCents(50n);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Minimum bet");
  });

  test("rejects bet above maximum", () => {
    const result = validateBetAmountCents(200_000n);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Maximum bet");
  });

  test("rejects zero bet", () => {
    const result = validateBetAmountCents(0n);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Bet amount must be positive");
  });

  test("rejects negative bet", () => {
    const result = validateBetAmountCents(-100n);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Bet amount must be positive");
  });
});

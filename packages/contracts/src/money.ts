export type MoneyCents = bigint;
export type MultiplierX100 = number;

export const MIN_BET_CENTS = 100n;      // $1.00
export const MAX_BET_CENTS = 100_000n;  // $1,000.00

export function calculatePayoutCents(
  amountCents: bigint,
  multiplierX100: number,
): bigint {
  return (amountCents * BigInt(multiplierX100)) / 100n;
}

export function formatMoneyCents(cents: bigint): string {
  const dollars = Number(cents) / 100;
  return dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseMoneyCents(input: string): bigint {
  const cleaned = input.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  const dollars = parts[0] || "0";
  const cents = (parts[1] || "0").padEnd(2, "0").slice(0, 2);
  return BigInt(dollars) * 100n + BigInt(cents);
}

export function validateBetAmountCents(amount: bigint): { valid: boolean; error?: string } {
  if (amount <= 0n) return { valid: false, error: "Bet amount must be positive" };
  if (amount < MIN_BET_CENTS) return { valid: false, error: `Minimum bet is ${formatMoneyCents(MIN_BET_CENTS)}` };
  if (amount > MAX_BET_CENTS) return { valid: false, error: `Maximum bet is ${formatMoneyCents(MAX_BET_CENTS)}` };
  return { valid: true };
}
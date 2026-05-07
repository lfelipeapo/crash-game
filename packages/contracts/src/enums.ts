export enum RoundState {
  BETTING = "betting",
  RUNNING = "running",
  CRASHED = "crashed",
  SETTLED = "settled",
}

export enum BetState {
  PENDING_DEBIT = "pending_debit",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  CASHED_OUT = "cashed_out",
  LOST = "lost",
}

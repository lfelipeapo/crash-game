export interface BaseEvent {
  eventId: string;
  type: string;
  correlationId: string;
  occurredAt: string; // ISO 8601
  playerId?: string;
  roundId?: string;
  betId?: string;
}

// Wallet events
export interface WalletDebitRequestedEvent extends BaseEvent {
  type: "wallet.debit.requested";
  playerId: string;
  amountCents: string; // bigint as string
  idempotencyKey: string;
  reason: "bet";
  betId: string;
}

export interface WalletDebitSucceededEvent extends BaseEvent {
  type: "wallet.debit.succeeded";
  playerId: string;
  amountCents: string;
  newBalanceCents: string;
  idempotencyKey: string;
  betId: string;
}

export interface WalletDebitFailedEvent extends BaseEvent {
  type: "wallet.debit.failed";
  playerId: string;
  amountCents: string;
  idempotencyKey: string;
  betId: string;
  reason: string;
}

export interface WalletCreditRequestedEvent extends BaseEvent {
  type: "wallet.credit.requested";
  playerId: string;
  amountCents: string;
  idempotencyKey: string;
  reason: "cashout";
  betId: string;
}

export interface WalletCreditSucceededEvent extends BaseEvent {
  type: "wallet.credit.succeeded";
  playerId: string;
  amountCents: string;
  newBalanceCents: string;
  idempotencyKey: string;
  betId: string;
}

export interface WalletCreditFailedEvent extends BaseEvent {
  type: "wallet.credit.failed";
  playerId: string;
  amountCents: string;
  idempotencyKey: string;
  betId: string;
  reason: string;
}

// Round events
export interface RoundBettingStartedEvent extends BaseEvent {
  type: "round.betting.started";
  roundId: string;
  serverSeedHash: string;
  bettingEndsAt: string; // ISO 8601
}

export interface RoundRunningStartedEvent extends BaseEvent {
  type: "round.running.started";
  roundId: string;
  startedAt: string;
}

export interface RoundMultiplierTickEvent extends BaseEvent {
  type: "round.multiplier.tick";
  roundId: string;
  multiplierX100: number;
  elapsedMs: number;
}

export interface RoundCrashedEvent extends BaseEvent {
  type: "round.crashed";
  roundId: string;
  crashPointX100: number;
  serverSeed: string;
}

export interface RoundSettledEvent extends BaseEvent {
  type: "round.settled";
  roundId: string;
}

// Bet events
export interface BetAcceptedEvent extends BaseEvent {
  type: "bet.accepted";
  roundId: string;
  betId: string;
  playerId: string;
  amountCents: string;
}

export interface BetRejectedEvent extends BaseEvent {
  type: "bet.rejected";
  roundId: string;
  betId: string;
  playerId: string;
  amountCents: string;
  reason: string;
}

export interface BetCashedOutEvent extends BaseEvent {
  type: "bet.cashed_out";
  roundId: string;
  betId: string;
  playerId: string;
  amountCents: string;
  payoutCents: string;
  multiplierX100: number;
}

export interface WalletBalanceUpdatedEvent extends BaseEvent {
  type: "wallet.balance.updated";
  playerId: string;
  balanceCents: string;
}

export type CrashGameEvent =
  | WalletDebitRequestedEvent
  | WalletDebitSucceededEvent
  | WalletDebitFailedEvent
  | WalletCreditRequestedEvent
  | WalletCreditSucceededEvent
  | WalletCreditFailedEvent
  | RoundBettingStartedEvent
  | RoundRunningStartedEvent
  | RoundMultiplierTickEvent
  | RoundCrashedEvent
  | RoundSettledEvent
  | BetAcceptedEvent
  | BetRejectedEvent
  | BetCashedOutEvent
  | WalletBalanceUpdatedEvent;

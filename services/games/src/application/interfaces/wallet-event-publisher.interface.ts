export interface WalletDebitRequest {
  eventId: string;
  playerId: string;
  amountCents: bigint;
  idempotencyKey: string;
  betId: string;
}

export interface WalletCreditRequest {
  eventId: string;
  playerId: string;
  amountCents: bigint;
  idempotencyKey: string;
  betId: string;
}

export interface IWalletEventPublisher {
  publishDebitRequested(request: WalletDebitRequest): Promise<void>;
  publishCreditRequested(request: WalletCreditRequest): Promise<void>;
}

import { Wallet } from "../../domain/entities/wallet.entity";
import { WalletTransaction } from "../../domain/entities/wallet-transaction.entity";
import type { IWalletRepository } from "../../domain/repositories/wallet.repository.interface";
import { v4 as uuidv4 } from "uuid";

export interface DebitWalletInput {
  playerId: string;
  amountCents: bigint;
  idempotencyKey: string;
  betId: string;
}

export interface DebitWalletResult {
  wallet: Wallet;
  transaction: WalletTransaction;
}

export class DebitWalletUseCase {
  constructor(private readonly walletRepository: IWalletRepository) {}

  async execute(input: DebitWalletInput): Promise<DebitWalletResult> {
    const wallet = await this.walletRepository.findByPlayerId(input.playerId);
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const existingTx = await this.walletRepository.findTransactionByIdempotencyKey(
      input.idempotencyKey,
    );
    if (existingTx) {
      return { wallet, transaction: existingTx };
    }

    if (!wallet.canDebit(input.amountCents)) {
      throw new Error("Insufficient balance");
    }

    wallet.debit(input.amountCents);

    const transaction = new WalletTransaction(
      uuidv4(),
      wallet.id,
      "debit",
      input.amountCents,
      input.idempotencyKey,
      "bet",
      input.betId,
      new Date(),
    );

    await this.walletRepository.saveWithTransaction(wallet, transaction);

    return { wallet, transaction };
  }
}

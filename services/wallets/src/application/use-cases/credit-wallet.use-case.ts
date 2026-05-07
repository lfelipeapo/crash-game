import { Wallet } from "../../domain/entities/wallet.entity";
import { WalletTransaction } from "../../domain/entities/wallet-transaction.entity";
import type { IWalletRepository } from "../../domain/repositories/wallet.repository.interface";
import { v4 as uuidv4 } from "uuid";

export interface CreditWalletInput {
  playerId: string;
  amountCents: bigint;
  idempotencyKey: string;
  betId: string;
}

export interface CreditWalletResult {
  wallet: Wallet;
  transaction: WalletTransaction;
}

export class CreditWalletUseCase {
  constructor(private readonly walletRepository: IWalletRepository) {}

  async execute(input: CreditWalletInput): Promise<CreditWalletResult> {
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

    wallet.credit(input.amountCents);

    const transaction = new WalletTransaction(
      uuidv4(),
      wallet.id,
      "credit",
      input.amountCents,
      input.idempotencyKey,
      "cashout",
      input.betId,
      new Date(),
    );

    await this.walletRepository.saveWithTransaction(wallet, transaction);

    return { wallet, transaction };
  }
}

import { Wallet } from "../entities/wallet.entity";
import { WalletTransaction } from "../entities/wallet-transaction.entity";

export interface IWalletRepository {
  create(playerId: string): Promise<Wallet>;
  findByPlayerId(playerId: string): Promise<Wallet | null>;
  findById(id: string): Promise<Wallet | null>;
  save(wallet: Wallet): Promise<void>;
  addTransaction(transaction: WalletTransaction): Promise<void>;
  findTransactionByIdempotencyKey(key: string): Promise<WalletTransaction | null>;
  saveWithTransaction(wallet: Wallet, transaction: WalletTransaction): Promise<void>;
}

import { Wallet } from "../../domain/entities/wallet.entity";
import type { IWalletRepository } from "../../domain/repositories/wallet.repository.interface";

export class CreateWalletUseCase {
  constructor(private readonly walletRepository: IWalletRepository) {}

  async execute(playerId: string): Promise<Wallet> {
    const existing = await this.walletRepository.findByPlayerId(playerId);
    if (existing) {
      return existing;
    }
    return this.walletRepository.create(playerId);
  }
}

import { Wallet } from "../../domain/entities/wallet.entity";
import type { IWalletRepository } from "../../domain/repositories/wallet.repository.interface";

export class GetWalletUseCase {
  constructor(private readonly walletRepository: IWalletRepository) {}

  async execute(playerId: string): Promise<Wallet | null> {
    return this.walletRepository.findByPlayerId(playerId);
  }
}

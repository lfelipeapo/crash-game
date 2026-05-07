import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import type { WalletResponseDto } from "@crash/contracts";
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { CurrentUser } from "../decorators/current-user.decorator";
import type { UserContext } from "../decorators/current-user.decorator";
import { CreateWalletUseCase } from "../../application/use-cases/create-wallet.use-case";
import { GetWalletUseCase } from "../../application/use-cases/get-wallet.use-case";
import { Wallet } from "../../domain/entities/wallet.entity";

function toWalletResponseDto(wallet: Wallet): WalletResponseDto {
  return {
    id: wallet.id,
    playerId: wallet.playerId,
    balanceCents: wallet.balanceCents.toString(),
    createdAt: wallet.createdAt.toISOString(),
    updatedAt: wallet.updatedAt.toISOString(),
  };
}

@Controller()
export class WalletsController {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly getWalletUseCase: GetWalletUseCase,
  ) {}

  @Get("health")
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "wallets" };
  }

  @Post("")
  @UseGuards(JwtAuthGuard)
  async createWallet(@CurrentUser() user: UserContext): Promise<WalletResponseDto> {
    const wallet = await this.createWalletUseCase.execute(user.playerId);
    return toWalletResponseDto(wallet);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getMyWallet(@CurrentUser() user: UserContext): Promise<WalletResponseDto> {
    const wallet = await this.getWalletUseCase.execute(user.playerId);
    if (!wallet) {
      const created = await this.createWalletUseCase.execute(user.playerId);
      return toWalletResponseDto(created);
    }
    return toWalletResponseDto(wallet);
  }
}

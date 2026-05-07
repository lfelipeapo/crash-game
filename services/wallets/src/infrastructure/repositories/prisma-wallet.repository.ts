import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Wallet } from "../../domain/entities/wallet.entity";
import { WalletTransaction } from "../../domain/entities/wallet-transaction.entity";
import type { IWalletRepository } from "../../domain/repositories/wallet.repository.interface";

@Injectable()
export class PrismaWalletRepository implements IWalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(playerId: string): Promise<Wallet> {
    const record = await this.prisma.wallet.create({
      data: {
        playerId,
        balanceCents: BigInt(100000),
      },
    });
    return this.toDomain(record);
  }

  async findByPlayerId(playerId: string): Promise<Wallet | null> {
    const record = await this.prisma.wallet.findUnique({
      where: { playerId },
    });
    return record ? this.toDomain(record) : null;
  }

  async findById(id: string): Promise<Wallet | null> {
    const record = await this.prisma.wallet.findUnique({
      where: { id },
    });
    return record ? this.toDomain(record) : null;
  }

  async save(wallet: Wallet): Promise<void> {
    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balanceCents: wallet.balanceCents,
        updatedAt: wallet.updatedAt,
      },
    });
  }

  async addTransaction(transaction: WalletTransaction): Promise<void> {
    await this.prisma.walletTransaction.create({
      data: {
        id: transaction.id,
        walletId: transaction.walletId,
        type: transaction.type,
        amountCents: transaction.amountCents,
        idempotencyKey: transaction.idempotencyKey,
        reason: transaction.reason,
        betId: transaction.betId,
        createdAt: transaction.createdAt,
      },
    });
  }

  async saveWithTransaction(wallet: Wallet, transaction: WalletTransaction): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balanceCents: wallet.balanceCents,
          updatedAt: wallet.updatedAt,
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          id: transaction.id,
          walletId: transaction.walletId,
          type: transaction.type,
          amountCents: transaction.amountCents,
          idempotencyKey: transaction.idempotencyKey,
          reason: transaction.reason,
          betId: transaction.betId,
          createdAt: transaction.createdAt,
        },
      }),
    ]);
  }

  async findTransactionByIdempotencyKey(key: string): Promise<WalletTransaction | null> {
    const record = await this.prisma.walletTransaction.findUnique({
      where: { idempotencyKey: key },
    });
    return record ? this.toTransactionDomain(record) : null;
  }

  private toDomain(record: {
    id: string;
    playerId: string;
    balanceCents: bigint;
    createdAt: Date;
    updatedAt: Date;
  }): Wallet {
    return new Wallet(
      record.id,
      record.playerId,
      record.balanceCents,
      record.createdAt,
      record.updatedAt,
    );
  }

  private toTransactionDomain(record: {
    id: string;
    walletId: string;
    type: string;
    amountCents: bigint;
    idempotencyKey: string;
    reason: string;
    betId: string | null;
    createdAt: Date;
  }): WalletTransaction {
    return new WalletTransaction(
      record.id,
      record.walletId,
      record.type as "debit" | "credit",
      record.amountCents,
      record.idempotencyKey,
      record.reason as "bet" | "cashout",
      record.betId,
      record.createdAt,
    );
  }
}

import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { IRoundRepository } from "../../domain/repositories/round.repository.interface";
import { Round } from "../../domain/entities/round.entity";
import { RoundState } from "@crash/contracts";

@Injectable()
export class PrismaRoundRepository implements IRoundRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(round: Round): Promise<void> {
    const data = round.toJSON();
    await this.prisma.round.create({
      data: {
        id: data.id,
        state: data.state,
        serverSeed: data.serverSeed,
        serverSeedHash: data.serverSeedHash,
        clientSeed: data.clientSeed,
        nonce: data.nonce,
        crashPointX100: data.crashPointX100,
        multiplierX100: data.multiplierX100,
        startedAt: data.startedAt,
        crashedAt: data.crashedAt,
        settledAt: data.settledAt,
        bettingEndsAt: data.bettingEndsAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<Round | null> {
    const row = await this.prisma.round.findUnique({ where: { id } });
    if (!row) return null;
    return this.mapToEntity(row);
  }

  async findCurrent(): Promise<Round | null> {
    const row = await this.prisma.round.findFirst({
      where: {
        state: { in: ["betting", "running", "crashed"] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!row) return null;
    return this.mapToEntity(row);
  }

  async findHistory(limit: number, offset: number): Promise<{ rounds: Round[]; total: number }> {
    const [rows, total] = await Promise.all([
      this.prisma.round.findMany({
        where: { state: { in: ["crashed", "settled"] } },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      this.prisma.round.count({
        where: { state: { in: ["crashed", "settled"] } },
      }),
    ]);

    return {
      rounds: rows.map(r => this.mapToEntity(r)),
      total,
    };
  }

  async save(round: Round): Promise<void> {
    const data = round.toJSON();
    await this.prisma.round.update({
      where: { id: data.id },
      data: {
        state: data.state,
        serverSeed: data.serverSeed,
        serverSeedHash: data.serverSeedHash,
        clientSeed: data.clientSeed,
        nonce: data.nonce,
        crashPointX100: data.crashPointX100,
        multiplierX100: data.multiplierX100,
        startedAt: data.startedAt,
        crashedAt: data.crashedAt,
        settledAt: data.settledAt,
        bettingEndsAt: data.bettingEndsAt,
        updatedAt: data.updatedAt,
      },
    });
  }

  private mapToEntity(row: any): Round {
    return Round.reconstitute({
      id: row.id,
      state: row.state as RoundState,
      serverSeed: row.serverSeed,
      serverSeedHash: row.serverSeedHash,
      clientSeed: row.clientSeed,
      nonce: row.nonce,
      crashPointX100: row.crashPointX100,
      multiplierX100: row.multiplierX100,
      startedAt: row.startedAt,
      crashedAt: row.crashedAt,
      settledAt: row.settledAt,
      bettingEndsAt: row.bettingEndsAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}

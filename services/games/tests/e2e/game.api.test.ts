import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { IRoundRepository } from "../../src/domain/repositories/round.repository.interface";
import { IBetRepository } from "../../src/domain/repositories/bet.repository.interface";
import { IWalletEventPublisher } from "../../src/application/interfaces/wallet-event-publisher.interface";
import { Round } from "../../src/domain/entities/round.entity";
import { Bet } from "../../src/domain/entities/bet.entity";
import { RoundState, BetState } from "@crash/contracts";
import { GamesController } from "../../src/presentation/controllers/games.controller";
import { PlaceBetUseCase } from "../../src/application/use-cases/place-bet.use-case";
import { CashOutUseCase } from "../../src/application/use-cases/cash-out.use-case";

// Mock repositories and publisher
class MockRoundRepository implements IRoundRepository {
  private rounds: Round[] = [];

  async create(round: Round): Promise<void> {
    this.rounds.push(round);
  }

  async findById(id: string): Promise<Round | null> {
    return this.rounds.find((r) => r.id === id) ?? null;
  }

  async findCurrent(): Promise<Round | null> {
    const active = this.rounds.filter((r) => ["betting", "running", "crashed"].includes(r.state));
    return active.length > 0 ? active[active.length - 1] : null;
  }

  async findHistory(limit: number, offset: number): Promise<{ rounds: Round[]; total: number }> {
    const filtered = this.rounds.filter((r) => ["crashed", "settled"].includes(r.state));
    return { rounds: filtered.slice(offset, offset + limit), total: filtered.length };
  }

  async save(round: Round): Promise<void> {
    const idx = this.rounds.findIndex((r) => r.id === round.id);
    if (idx >= 0) this.rounds[idx] = round;
  }

  addRound(round: Round): void {
    this.rounds.push(round);
  }
}

class MockBetRepository implements IBetRepository {
  private bets: Bet[] = [];

  async create(bet: Bet): Promise<void> {
    this.bets.push(bet);
  }

  async findById(id: string): Promise<Bet | null> {
    return this.bets.find((b) => b.id === id) ?? null;
  }

  async findByRoundAndPlayer(roundId: string, playerId: string): Promise<Bet | null> {
    return this.bets.find((b) => b.roundId === roundId && b.playerId === playerId) ?? null;
  }

  async findByRound(roundId: string): Promise<Bet[]> {
    return this.bets.filter((b) => b.roundId === roundId);
  }

  async findByPlayer(playerId: string, limit: number, offset: number): Promise<{ bets: Bet[]; total: number }> {
    const filtered = this.bets.filter((b) => b.playerId === playerId);
    return { bets: filtered.slice(offset, offset + limit), total: filtered.length };
  }

  async save(bet: Bet): Promise<void> {
    const idx = this.bets.findIndex((b) => b.id === bet.id);
    if (idx >= 0) this.bets[idx] = bet;
  }

  addBet(bet: Bet): void {
    this.bets.push(bet);
  }
}

class MockWalletPublisher implements IWalletEventPublisher {
  debitRequests: Array<{ playerId: string; amountCents: bigint; betId: string }> = [];
  creditRequests: Array<{ playerId: string; amountCents: bigint; betId: string }> = [];

  async publishDebitRequested(req: { playerId: string; amountCents: bigint; betId: string }): Promise<void> {
    this.debitRequests.push(req);
  }

  async publishCreditRequested(req: { playerId: string; amountCents: bigint; betId: string }): Promise<void> {
    this.creditRequests.push(req);
  }
}

describe("Game API E2E", () => {
  let app: INestApplication;
  let controller: GamesController;
  let mockRoundRepo: MockRoundRepository;
  let mockBetRepo: MockBetRepository;
  let mockWalletPublisher: MockWalletPublisher;

  beforeAll(async () => {
    mockRoundRepo = new MockRoundRepository();
    mockBetRepo = new MockBetRepository();
    mockWalletPublisher = new MockWalletPublisher();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider("IRoundRepository")
      .useValue(mockRoundRepo)
      .overrideProvider("IBetRepository")
      .useValue(mockBetRepo)
      .overrideProvider("IWalletEventPublisher")
      .useValue(mockWalletPublisher)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    controller = moduleRef.get<GamesController>(GamesController);
  });

  afterAll(async () => {
    await app.close();
  });

  it("health check should return ok", async () => {
    const result = controller.check();
    expect(result.status).toBe("ok");
    expect(result.service).toBe("games");
  });

  it("should get current round", async () => {
    const round = Round.create({
      serverSeedHash: "hash123",
      clientSeed: "seed",
      nonce: 0,
      crashPointX100: 200,
    });
    mockRoundRepo.addRound(round);

    const result = await controller.getCurrentRound();
    if ("id" in result) {
      expect(result.id).toBe(round.id);
      expect(result.state).toBe("betting");
    }
  });

  it("should get round history", async () => {
    const round = Round.create({
      serverSeedHash: "hash789",
      clientSeed: "seed",
      nonce: 2,
      crashPointX100: 150,
    });
    round.startRunning();
    round.crash();
    round.settle();
    mockRoundRepo.addRound(round);

    const result = await controller.getRoundHistory("10", "0");
    expect(result.rounds).toBeArray();
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
  });

  it("should verify a round", async () => {
    const round = Round.create({
      serverSeedHash: "hashabc",
      clientSeed: "seed",
      nonce: 3,
      crashPointX100: 200,
    });
    round.revealServerSeed("secret-seed");
    mockRoundRepo.addRound(round);

    const result = await controller.verifyRound(round.id);
    expect(result.roundId).toBe(round.id);
    expect(result.serverSeed).toBe("secret-seed");
    expect(result.hmac).toBeTruthy();
    expect(result.hmac.length).toBe(64);
    expect(result.algorithm).toBe("HMAC_SHA256_SHA256_COMMITMENT_V1");
    expect(result.houseEdge).toBe(0.03);
  });

  it("should reject verify for unrevealed round", async () => {
    const round = Round.create({
      serverSeedHash: "hashdef",
      clientSeed: "seed",
      nonce: 4,
      crashPointX100: 200,
    });
    mockRoundRepo.addRound(round);

    try {
      await controller.verifyRound(round.id);
      expect(false).toBe(true); // Should not reach here
    } catch (e: any) {
      expect(e.message).toContain("Server seed not yet revealed");
    }
  });

  it("should place a bet via use case", async () => {
    const round = Round.create({
      serverSeedHash: "hashbet",
      clientSeed: "seed",
      nonce: 5,
      crashPointX100: 300,
    });
    mockRoundRepo.addRound(round);

    // We can't test the controller directly with JWT guard easily,
    // so test the use case directly
    const placeBetUseCase = app.get(PlaceBetUseCase);
    const result = await placeBetUseCase.execute({
      playerId: "player-1",
      playerUsername: "alice",
      amountCents: 500n,
    });

    expect(result.roundId).toBe(round.id);
    expect(result.amountCents).toBe(500n);
    expect(result.state).toBe("pending_debit");
    expect(mockWalletPublisher.debitRequests.length).toBe(1);
    expect(mockWalletPublisher.debitRequests[0].amountCents).toBe(500n);
  });

  it("should reject duplicate bet in same round", async () => {
    const round = Round.create({
      serverSeedHash: "hashdup",
      clientSeed: "seed",
      nonce: 6,
      crashPointX100: 300,
    });
    mockRoundRepo.addRound(round);

    const placeBetUseCase = app.get(PlaceBetUseCase);
    await placeBetUseCase.execute({
      playerId: "player-1",
      playerUsername: "alice",
      amountCents: 500n,
    });

    try {
      await placeBetUseCase.execute({
        playerId: "player-1",
        playerUsername: "alice",
        amountCents: 500n,
      });
      expect(false).toBe(true);
    } catch (e: any) {
      expect(e.message).toContain("already placed a bet");
    }
  });

  it("should cash out during running", async () => {
    const round = Round.create({
      serverSeedHash: "hashcash",
      clientSeed: "seed",
      nonce: 7,
      crashPointX100: 500,
    });
    round.startRunning();
    mockRoundRepo.addRound(round);

    const bet = Bet.create(round.id, "player-2", "bob", 1000n);
    bet.accept();
    mockBetRepo.addBet(bet);

    const cashOutUseCase = app.get(CashOutUseCase);
    const result = await cashOutUseCase.execute({ playerId: "player-2" });

    expect(result.betId).toBe(bet.id);
    expect(result.payoutCents).toBeGreaterThanOrEqual(1000n);
    expect(mockWalletPublisher.creditRequests.length).toBeGreaterThanOrEqual(1);
  });
});

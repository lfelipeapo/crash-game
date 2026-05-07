import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Round } from "../../domain/entities/round.entity";
import { Bet } from "../../domain/entities/bet.entity";
import type { IRoundRepository } from "../../domain/repositories/round.repository.interface";
import type { IBetRepository } from "../../domain/repositories/bet.repository.interface";
import { ProvablyFairService } from "../../domain/services/provably-fair.service";
import { GameEventBus } from "./game-event-bus.service";
import { CashOutUseCase } from "../../application/use-cases/cash-out.use-case";
import type {
  RoundBettingStartedEvent,
  RoundRunningStartedEvent,
  RoundMultiplierTickEvent,
  RoundCrashedEvent,
  RoundSettledEvent,
} from "@crash/contracts";

const BETTING_PHASE_MS = 10000;
const TICK_INTERVAL_MS = 100;
const SETTLE_DELAY_MS = 3000;

@Injectable()
export class GameLoopService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GameLoopService.name);
  private readonly provablyFair = new ProvablyFairService();
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;
  private currentRound: Round | null = null;
  private isRunning = false;

  constructor(
    @Inject("IRoundRepository")
    private readonly roundRepo: IRoundRepository,
    @Inject("IBetRepository")
    private readonly betRepo: IBetRepository,
    private readonly eventBus: GameEventBus,
    private readonly cashOutUseCase: CashOutUseCase,
  ) {}

  async onModuleInit(): Promise<void> {
    // Start the game loop after a brief delay to allow infrastructure to initialize
    setTimeout(() => this.startGameLoop(), 1000);
  }

  onModuleDestroy(): void {
    this.stopTimers();
  }

  private stopTimers(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  private async startGameLoop(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // Check if there's an existing active round (e.g., after restart)
    const existingRound = await this.roundRepo.findCurrent();
    if (existingRound) {
      this.currentRound = existingRound;
      this.logger.log(`Resumed round: ${existingRound.id} in state ${existingRound.state}`);
      // If the round is already running, resume ticks
      if (existingRound.state === "running") {
        this.startTicking();
        return;
      }
      if (existingRound.state === "betting") {
        // Calculate remaining betting time
        const remainingMs = existingRound.bettingEndsAt
          ? Math.max(0, existingRound.bettingEndsAt.getTime() - Date.now())
          : BETTING_PHASE_MS;
        this.scheduleRunning(remainingMs);
        return;
      }
      // For crashed, settle and start new
      if (existingRound.state === "crashed") {
        await this.settleRound();
        return;
      }
    }

    await this.createNewRound();
  }

  private async createNewRound(): Promise<void> {
    const serverSeed = this.provablyFair.generateServerSeed();
    const serverSeedHash = this.provablyFair.hashServerSeed(serverSeed);
    const nonce = this.currentRound ? this.currentRound.nonce + 1 : 0;
    const clientSeed = "default-client-seed";

    const crashPointX100 = this.provablyFair.calculateCrashPointX100(
      serverSeed,
      clientSeed,
      nonce,
    );

    const round = Round.create({
      serverSeed,
      serverSeedHash,
      clientSeed,
      nonce,
      crashPointX100,
    });

    await this.roundRepo.create(round);
    this.currentRound = round;

    this.logger.log(
      `New round created: ${round.id}, hash: ${serverSeedHash.substring(0, 16)}..., crash: ${crashPointX100 / 100}x`,
    );

    const event: RoundBettingStartedEvent = {
      eventId: randomUUID(),
      type: "round.betting.started",
      correlationId: round.id,
      occurredAt: new Date().toISOString(),
      roundId: round.id,
      serverSeedHash: round.serverSeedHash,
      bettingEndsAt: new Date(Date.now() + BETTING_PHASE_MS).toISOString(),
    };
    this.eventBus.emit(event);

    this.scheduleRunning(BETTING_PHASE_MS);
  }

  private scheduleRunning(delayMs: number): void {
    this.phaseTimer = setTimeout(() => this.startRunning(), delayMs);
  }

  private async startRunning(): Promise<void> {
    if (!this.currentRound) return;

    this.currentRound.startRunning();
    await this.roundRepo.save(this.currentRound);

    this.logger.log(`Round ${this.currentRound.id} is now running`);

    const event: RoundRunningStartedEvent = {
      eventId: randomUUID(),
      type: "round.running.started",
      correlationId: this.currentRound.id,
      occurredAt: new Date().toISOString(),
      roundId: this.currentRound.id,
      startedAt: this.currentRound.startedAt!.toISOString(),
    };
    this.eventBus.emit(event);

    this.startTicking();
  }

  private startTicking(): void {
    this.tickTimer = setInterval(() => this.tick(), TICK_INTERVAL_MS);
  }

  private async tick(): Promise<void> {
    if (!this.currentRound) return;
    const round = this.currentRound;

    const startedAt = round.startedAt;
    if (!startedAt) return;

    const elapsedMs = Date.now() - startedAt.getTime();
    const multiplierX100 = round.getCurrentMultiplierX100(elapsedMs);
    const crashPoint = round.crashPointX100;

    round.updateMultiplierX100(multiplierX100);

    // Auto cashout check — process before crash check so players win if target equals crash point
    await this.processAutoCashouts(round, multiplierX100);

    const tickEvent: RoundMultiplierTickEvent = {
      eventId: randomUUID(),
      type: "round.multiplier.tick",
      correlationId: round.id,
      occurredAt: new Date().toISOString(),
      roundId: round.id,
      multiplierX100,
      elapsedMs,
    };
    this.eventBus.emit(tickEvent);

    // Check crash
    if (crashPoint !== null && multiplierX100 >= crashPoint) {
      await this.handleCrash(round);
    }
  }

  private async processAutoCashouts(round: Round, multiplierX100: number): Promise<void> {
    const acceptedBets = await this.betRepo.findAcceptedByRound(round.id);
    for (const bet of acceptedBets) {
      if (
        bet.autoCashoutMultiplierX100 !== null &&
        bet.autoCashoutMultiplierX100 !== undefined &&
        multiplierX100 >= bet.autoCashoutMultiplierX100
      ) {
        try {
          await this.cashOutUseCase.execute({ playerId: bet.playerId });
          this.logger.log(`Auto cashout triggered for bet ${bet.id} at ${multiplierX100 / 100}x`);
        } catch (error: any) {
          // Bet may have been manually cashed out or round crashed — log and continue
          this.logger.warn(`Auto cashout failed for bet ${bet.id}: ${error.message}`);
        }
      }
    }
  }

  private async handleCrash(round: Round): Promise<void> {
    this.stopTimers();

    round.crash();
    round.revealServerSeed(round.serverSeed ?? "");
    await this.roundRepo.save(round);

    this.logger.log(
      `Round ${round.id} crashed at ${round.crashPointX100 ? round.crashPointX100 / 100 : "?"}x`,
    );

    // Mark all remaining accepted bets as lost
    const bets = await this.betRepo.findByRound(round.id);
    for (const bet of bets) {
      if (bet.state === "accepted") {
        bet.markLost();
        await this.betRepo.save(bet);
      }
    }

    const event: RoundCrashedEvent = {
      eventId: randomUUID(),
      type: "round.crashed",
      correlationId: round.id,
      occurredAt: new Date().toISOString(),
      roundId: round.id,
      crashPointX100: round.crashPointX100 ?? 0,
      serverSeed: round.serverSeed ?? "",
    };
    this.eventBus.emit(event);

    // Schedule settlement
    this.phaseTimer = setTimeout(() => this.settleRound(), SETTLE_DELAY_MS);
  }

  private async settleRound(): Promise<void> {
    if (!this.currentRound) return;

    this.currentRound.settle();
    await this.roundRepo.save(this.currentRound);

    this.logger.log(`Round ${this.currentRound.id} settled`);

    const event: RoundSettledEvent = {
      eventId: randomUUID(),
      type: "round.settled",
      correlationId: this.currentRound.id,
      occurredAt: new Date().toISOString(),
      roundId: this.currentRound.id,
    };
    this.eventBus.emit(event);

    // Create new round
    await this.createNewRound();
  }

  getCurrentRound(): Round | null {
    return this.currentRound;
  }
}

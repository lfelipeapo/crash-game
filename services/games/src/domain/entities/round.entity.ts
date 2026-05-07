import { RoundState } from "@crash/contracts";
import { randomUUID } from "crypto";

export interface RoundProps {
  id: string;
  state: RoundState;
  serverSeed: string | null;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  crashPointX100: number | null;
  multiplierX100: number;
  startedAt: Date | null;
  crashedAt: Date | null;
  settledAt: Date | null;
  bettingEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Round {
  private constructor(private props: RoundProps) {}

  static create(props: Omit<RoundProps, "id" | "state" | "serverSeed" | "startedAt" | "crashedAt" | "settledAt" | "bettingEndsAt" | "createdAt" | "updatedAt" | "multiplierX100"> & Partial<Pick<RoundProps, "id" | "state" | "serverSeed" | "startedAt" | "crashedAt" | "settledAt" | "bettingEndsAt" | "createdAt" | "updatedAt" | "multiplierX100">>): Round {
    return new Round({
      ...props,
      id: props.id ?? randomUUID(),
      state: props.state ?? RoundState.BETTING,
      serverSeed: props.serverSeed ?? null,
      startedAt: props.startedAt ?? null,
      crashedAt: props.crashedAt ?? null,
      settledAt: props.settledAt ?? null,
      bettingEndsAt: props.bettingEndsAt ?? null,
      multiplierX100: props.multiplierX100 ?? 100,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
  }

  static reconstitute(props: RoundProps): Round {
    return new Round({ ...props });
  }

  get id(): string { return this.props.id; }
  get state(): RoundState { return this.props.state; }
  get serverSeed(): string | null { return this.props.serverSeed; }
  get serverSeedHash(): string { return this.props.serverSeedHash; }
  get clientSeed(): string { return this.props.clientSeed; }
  get nonce(): number { return this.props.nonce; }
  get crashPointX100(): number | null { return this.props.crashPointX100; }
  get multiplierX100(): number { return this.props.multiplierX100; }
  get startedAt(): Date | null { return this.props.startedAt; }
  get crashedAt(): Date | null { return this.props.crashedAt; }
  get settledAt(): Date | null { return this.props.settledAt; }
  get bettingEndsAt(): Date | null { return this.props.bettingEndsAt; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  startBetting(bettingDurationMs: number): void {
    if (this.props.state !== RoundState.SETTLED && this.props.state !== RoundState.CRASHED) {
      throw new Error(`Cannot start betting from state: ${this.props.state}`);
    }
    this.props.state = RoundState.BETTING;
    this.props.bettingEndsAt = new Date(Date.now() + bettingDurationMs);
    this.props.multiplierX100 = 100;
    this.props.startedAt = null;
    this.props.crashedAt = null;
    this.props.settledAt = null;
    this.props.updatedAt = new Date();
  }

  startRunning(): void {
    if (this.props.state !== RoundState.BETTING) {
      throw new Error(`Cannot start running from state: ${this.props.state}`);
    }
    this.props.state = RoundState.RUNNING;
    this.props.startedAt = new Date();
    this.props.updatedAt = new Date();
  }

  crash(): void {
    if (this.props.state !== RoundState.RUNNING) {
      throw new Error(`Cannot crash from state: ${this.props.state}`);
    }
    this.props.state = RoundState.CRASHED;
    this.props.crashedAt = new Date();
    this.props.updatedAt = new Date();
  }

  settle(): void {
    if (this.props.state !== RoundState.CRASHED) {
      throw new Error(`Cannot settle from state: ${this.props.state}`);
    }
    this.props.state = RoundState.SETTLED;
    this.props.settledAt = new Date();
    this.props.updatedAt = new Date();
  }

  setCrashPointX100(value: number): void {
    if (this.props.crashPointX100 !== null) {
      throw new Error("Crash point already set");
    }
    this.props.crashPointX100 = value;
    this.props.updatedAt = new Date();
  }

  revealServerSeed(seed: string): void {
    this.props.serverSeed = seed;
    this.props.updatedAt = new Date();
  }

  updateMultiplierX100(value: number): void {
    if (this.props.state !== RoundState.RUNNING) {
      throw new Error("Can only update multiplier during running state");
    }
    this.props.multiplierX100 = value;
    this.props.updatedAt = new Date();
  }

  canBet(): boolean {
    return this.props.state === RoundState.BETTING;
  }

  canCashOut(): boolean {
    return this.props.state === RoundState.RUNNING;
  }

  getCurrentMultiplierX100(elapsedMs: number): number {
    // Simple growth formula: starts at 1.00x and grows
    // multiplier = 1 + (elapsedMs / 5000) * 0.5
    // In x100 terms: 100 + floor(elapsedMs * 0.01)
    // e.g., at 1000ms => 110 (1.10x), at 5000ms => 150 (1.50x)
    const growth = Math.floor(elapsedMs / 20); // 100ms tick => +5 per tick
    return 100 + growth;
  }

  toJSON(): RoundProps {
    return { ...this.props };
  }
}
import { BetState } from "@crash/contracts";
import { calculatePayoutCents } from "@crash/contracts";
import { randomUUID } from "crypto";

export interface BetProps {
  id: string;
  roundId: string;
  playerId: string;
  playerUsername: string;
  amountCents: bigint;
  payoutCents: bigint | null;
  multiplierX100: number | null;
  autoCashoutMultiplierX100: number | null;
  state: BetState;
  createdAt: Date;
  updatedAt: Date;
}

export class Bet {
  private constructor(private props: BetProps) {}

  static create(
    roundId: string,
    playerId: string,
    playerUsername: string,
    amountCents: bigint,
    autoCashoutMultiplierX100?: number,
  ): Bet {
    return new Bet({
      id: randomUUID(),
      roundId,
      playerId,
      playerUsername,
      amountCents,
      payoutCents: null,
      multiplierX100: null,
      autoCashoutMultiplierX100: autoCashoutMultiplierX100 ?? null,
      state: BetState.PENDING_DEBIT,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: BetProps): Bet {
    return new Bet({
      ...props,
      amountCents: BigInt(props.amountCents),
      payoutCents: props.payoutCents !== null ? BigInt(props.payoutCents) : null,
    });
  }

  get id(): string { return this.props.id; }
  get roundId(): string { return this.props.roundId; }
  get playerId(): string { return this.props.playerId; }
  get playerUsername(): string { return this.props.playerUsername; }
  get amountCents(): bigint { return this.props.amountCents; }
  get payoutCents(): bigint | null { return this.props.payoutCents; }
  get multiplierX100(): number | null { return this.props.multiplierX100; }
  get autoCashoutMultiplierX100(): number | null { return this.props.autoCashoutMultiplierX100; }
  get state(): BetState { return this.props.state; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  setAutoCashout(multiplierX100: number): void {
    this.props.autoCashoutMultiplierX100 = multiplierX100;
    this.props.updatedAt = new Date();
  }

  accept(): void {
    if (this.props.state !== BetState.PENDING_DEBIT) {
      throw new Error(`Cannot accept bet from state: ${this.props.state}`);
    }
    this.props.state = BetState.ACCEPTED;
    this.props.updatedAt = new Date();
  }

  reject(): void {
    if (this.props.state !== BetState.PENDING_DEBIT) {
      throw new Error(`Cannot reject bet from state: ${this.props.state}`);
    }
    this.props.state = BetState.REJECTED;
    this.props.updatedAt = new Date();
  }

  cashOut(multiplierX100: number): bigint {
    if (this.props.state !== BetState.ACCEPTED) {
      throw new Error(`Cannot cash out bet from state: ${this.props.state}`);
    }
    const payout = calculatePayoutCents(this.props.amountCents, multiplierX100);
    this.props.multiplierX100 = multiplierX100;
    this.props.payoutCents = payout;
    this.props.state = BetState.CASHED_OUT;
    this.props.updatedAt = new Date();
    return payout;
  }

  markLost(): void {
    if (this.props.state !== BetState.ACCEPTED) {
      throw new Error(`Cannot mark lost from state: ${this.props.state}`);
    }
    this.props.state = BetState.LOST;
    this.props.updatedAt = new Date();
  }

  toJSON(): BetProps {
    return { ...this.props };
  }
}

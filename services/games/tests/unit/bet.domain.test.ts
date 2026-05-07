import { describe, expect, it } from "bun:test";
import { Bet } from "../../src/domain/entities/bet.entity";
import { BetState } from "@crash/contracts";

describe("Bet Entity", () => {
  it("should create a bet in pending_debit state", () => {
    const bet = Bet.create("round-1", "player-1", "alice", 500n);

    expect(bet.state).toBe(BetState.PENDING_DEBIT);
    expect(bet.roundId).toBe("round-1");
    expect(bet.playerId).toBe("player-1");
    expect(bet.playerUsername).toBe("alice");
    expect(bet.amountCents).toBe(500n);
    expect(bet.payoutCents).toBeNull();
    expect(bet.multiplierX100).toBeNull();
  });

  it("should transition from pending_debit to accepted", () => {
    const bet = Bet.create("round-1", "player-1", "alice", 500n);
    bet.accept();
    expect(bet.state).toBe(BetState.ACCEPTED);
  });

  it("should transition from pending_debit to rejected", () => {
    const bet = Bet.create("round-1", "player-1", "alice", 500n);
    bet.reject();
    expect(bet.state).toBe(BetState.REJECTED);
  });

  it("should cash out with correct payout", () => {
    const bet = Bet.create("round-1", "player-1", "alice", 1000n);
    bet.accept();

    const payout = bet.cashOut(250); // 2.50x
    expect(bet.state).toBe(BetState.CASHED_OUT);
    expect(bet.multiplierX100).toBe(250);
    expect(bet.payoutCents).toBe(2500n); // 1000 * 250 / 100
    expect(payout).toBe(2500n);
  });

  it("should mark accepted bet as lost", () => {
    const bet = Bet.create("round-1", "player-1", "alice", 1000n);
    bet.accept();
    bet.markLost();
    expect(bet.state).toBe(BetState.LOST);
  });

  it("should throw when cashing out from non-accepted state", () => {
    const bet = Bet.create("round-1", "player-1", "alice", 1000n);
    expect(() => bet.cashOut(200)).toThrow();
  });

  it("should throw when marking non-accepted bet as lost", () => {
    const bet = Bet.create("round-1", "player-1", "alice", 1000n);
    expect(() => bet.markLost()).toThrow();
  });

  it("should reconstitute from props", () => {
    const bet = Bet.reconstitute({
      id: "bet-1",
      roundId: "round-1",
      playerId: "player-1",
      playerUsername: "alice",
      amountCents: 1000n,
      payoutCents: 2500n,
      multiplierX100: 250,
      autoCashoutMultiplierX100: null,
      state: BetState.CASHED_OUT,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(bet.id).toBe("bet-1");
    expect(bet.amountCents).toBe(1000n);
    expect(bet.payoutCents).toBe(2500n);
    expect(bet.state).toBe(BetState.CASHED_OUT);
  });
});

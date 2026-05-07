import { describe, expect, it } from "bun:test";
import { Round } from "../../src/domain/entities/round.entity";
import { RoundState } from "@crash/contracts";

describe("Round Entity", () => {
  it("should create a round in betting state", () => {
    const round = Round.create({
      serverSeedHash: "abc123",
      clientSeed: "client-seed",
      nonce: 0,
      crashPointX100: 250,
    });

    expect(round.state).toBe(RoundState.BETTING);
    expect(round.serverSeedHash).toBe("abc123");
    expect(round.crashPointX100).toBe(250);
    expect(round.multiplierX100).toBe(100);
  });

  it("should transition from betting to running", () => {
    const round = Round.create({
      serverSeedHash: "abc123",
      clientSeed: "client-seed",
      nonce: 0,
      crashPointX100: 250,
    });

    round.startRunning();
    expect(round.state).toBe(RoundState.RUNNING);
    expect(round.startedAt).not.toBeNull();
  });

  it("should transition from running to crashed", () => {
    const round = Round.create({
      serverSeedHash: "abc123",
      clientSeed: "client-seed",
      nonce: 0,
      crashPointX100: 250,
    });

    round.startRunning();
    round.crash();
    expect(round.state).toBe(RoundState.CRASHED);
    expect(round.crashedAt).not.toBeNull();
  });

  it("should transition from crashed to settled", () => {
    const round = Round.create({
      serverSeedHash: "abc123",
      clientSeed: "client-seed",
      nonce: 0,
      crashPointX100: 250,
    });

    round.startRunning();
    round.crash();
    round.settle();
    expect(round.state).toBe(RoundState.SETTLED);
    expect(round.settledAt).not.toBeNull();
  });

  it("should allow betting only in betting state", () => {
    const round = Round.create({
      serverSeedHash: "abc123",
      clientSeed: "client-seed",
      nonce: 0,
      crashPointX100: 250,
    });

    expect(round.canBet()).toBe(true);
    round.startRunning();
    expect(round.canBet()).toBe(false);
  });

  it("should allow cashout only in running state", () => {
    const round = Round.create({
      serverSeedHash: "abc123",
      clientSeed: "client-seed",
      nonce: 0,
      crashPointX100: 250,
    });

    expect(round.canCashOut()).toBe(false);
    round.startRunning();
    expect(round.canCashOut()).toBe(true);
  });

  it("should throw on invalid state transitions", () => {
    const round = Round.create({
      serverSeedHash: "abc123",
      clientSeed: "client-seed",
      nonce: 0,
      crashPointX100: 250,
    });

    expect(() => round.crash()).toThrow();
    expect(() => round.settle()).toThrow();
  });

  it("should calculate multiplier based on elapsed time", () => {
    const round = Round.create({
      serverSeedHash: "abc123",
      clientSeed: "client-seed",
      nonce: 0,
      crashPointX100: 250,
    });

    expect(round.getCurrentMultiplierX100(0)).toBe(100);
    expect(round.getCurrentMultiplierX100(1000)).toBe(150); // 100 + floor(1000/20)
    expect(round.getCurrentMultiplierX100(5000)).toBe(350); // 100 + floor(5000/20)
  });

  it("should reveal server seed", () => {
    const round = Round.create({
      serverSeedHash: "abc123",
      clientSeed: "client-seed",
      nonce: 0,
      crashPointX100: 250,
    });

    expect(round.serverSeed).toBeNull();
    round.revealServerSeed("secret-seed");
    expect(round.serverSeed).toBe("secret-seed");
  });

  it("should not allow crash point to be set twice", () => {
    const round = Round.create({
      serverSeedHash: "abc123",
      clientSeed: "client-seed",
      nonce: 0,
      crashPointX100: 250,
    });

    expect(() => round.setCrashPointX100(300)).toThrow("Crash point already set");
  });
});

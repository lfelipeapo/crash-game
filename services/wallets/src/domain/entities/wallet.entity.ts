export class Wallet {
  constructor(
    public readonly id: string,
    public readonly playerId: string,
    public balanceCents: bigint,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  canDebit(amountCents: bigint): boolean {
    return this.balanceCents >= amountCents;
  }

  debit(amountCents: bigint): void {
    if (!this.canDebit(amountCents)) {
      throw new Error("Insufficient balance");
    }
    this.balanceCents -= amountCents;
    this.updatedAt = new Date();
  }

  credit(amountCents: bigint): void {
    this.balanceCents += amountCents;
    this.updatedAt = new Date();
  }
}

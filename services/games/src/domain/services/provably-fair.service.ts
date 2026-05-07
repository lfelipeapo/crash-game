import { createHash, randomBytes, createHmac } from "crypto";

export class ProvablyFairService {
  generateServerSeed(): string {
    return randomBytes(32).toString("hex");
  }

  hashServerSeed(serverSeed: string): string {
    return createHash("sha256").update(serverSeed).digest("hex");
  }

  /**
   * Calculate the HMAC-SHA256 used for crash point derivation.
   * This is the raw HMAC value that can be independently verified.
   */
  calculateHmac(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
  ): string {
    return createHmac("sha256", serverSeed)
      .update(`${clientSeed}:${nonce}`)
      .digest("hex");
  }

  calculateCrashPointX100(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    houseEdge: number = 0.03,
  ): number {
    const hmac = this.calculateHmac(serverSeed, clientSeed, nonce);

    // Take first 8 hex chars = 32 bits
    const hexPart = hmac.substring(0, 8);
    const intValue = parseInt(hexPart, 16);
    const maxValue = 0xffffffff; // 2^32 - 1

    // Normalize to [0, 1)
    const randomFloat = intValue / (maxValue + 1);

    // Apply house edge and crash formula
    // Standard crash formula: 0.99 / (1 - randomFloat)
    // With house edge: (1 - houseEdge) / (1 - randomFloat)
    const crashPoint = (1 - houseEdge) / (1 - randomFloat);

    // Minimum crash at 1.00x
    if (crashPoint < 1.0) return 100;

    // Cap at some reasonable max (e.g., 1000x = 100000)
    const capped = Math.min(crashPoint, 1000.0);
    return Math.floor(capped * 100);
  }

  verify(
    serverSeed: string,
    serverSeedHash: string,
    clientSeed: string,
    nonce: number,
    expectedCrashPointX100: number,
  ): boolean {
    const hash = this.hashServerSeed(serverSeed);
    if (hash !== serverSeedHash) return false;
    const calculated = this.calculateCrashPointX100(serverSeed, clientSeed, nonce);
    return calculated === expectedCrashPointX100;
  }
}

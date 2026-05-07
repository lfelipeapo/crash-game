import { describe, it, expect } from "bun:test";

describe("CrashChart render", () => {
  it("should be importable", async () => {
    const { CrashChart } = await import("@/components/CrashChart");
    expect(CrashChart).toBeDefined();
    expect(typeof CrashChart).toBe("function");
  });
});

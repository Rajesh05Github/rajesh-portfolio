import { describe, expect, it } from "vitest";
import { estimateCostUsd } from "@/lib/ai/cost";

describe("estimateCostUsd", () => {
  it("computes cost from real gpt-4o-mini pricing (input $0.15/M, output $0.60/M)", () => {
    const cost = estimateCostUsd("gpt-4o-mini", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.15 + 0.6, 10);
  });

  it("computes embedding cost with zero output tokens", () => {
    const cost = estimateCostUsd("text-embedding-3-small", 1_000_000, 0);
    expect(cost).toBeCloseTo(0.02, 10);
  });

  it("returns 0 for zero tokens", () => {
    expect(estimateCostUsd("gpt-4o-mini", 0, 0)).toBe(0);
  });

  it("returns 0 (never throws) for an unrecognized model", () => {
    expect(estimateCostUsd("some-future-model", 1000, 1000)).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { estimateTokenCount } from "@/lib/ai/token-estimate";

describe("estimateTokenCount", () => {
  it("returns 0 for empty text", () => {
    expect(estimateTokenCount("")).toBe(0);
  });

  it("rounds up to the nearest whole token (~4 chars/token)", () => {
    expect(estimateTokenCount("abcd")).toBe(1);
    expect(estimateTokenCount("abcde")).toBe(2);
    expect(estimateTokenCount("a".repeat(400))).toBe(100);
  });
});

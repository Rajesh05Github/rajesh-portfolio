import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/portfolio/queries", () => ({
  getProfile: vi.fn().mockResolvedValue({ name: "Test Owner" }),
}));

const { generalResponseNode, rejectNode } =
  await import("@/features/chatbot/graph/nodes/responses");

describe("generalResponseNode and rejectNode", () => {
  it("generalResponseNode returns a canned, grounded answer naming the owner, with no LLM call", async () => {
    const result = await generalResponseNode();
    expect(result.grounded).toBe(true);
    expect(result.answer).toBeTruthy();
    expect(result.answer).toContain("Test Owner");
  });

  it("rejectNode returns a canned, grounded answer with no LLM call", () => {
    const result = rejectNode();
    expect(result.grounded).toBe(true);
    expect(result.answer).toBeTruthy();
  });

  it("the two canned answers are distinct", async () => {
    const generalResult = await generalResponseNode();
    expect(generalResult.answer).not.toBe(rejectNode().answer);
  });
});

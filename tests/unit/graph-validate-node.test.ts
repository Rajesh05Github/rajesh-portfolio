import { describe, expect, it } from "vitest";
import { validateNode } from "@/features/chatbot/graph/nodes/validate";
import { makeState } from "../helpers/graph-state";

const CONTEXT_TEXT =
  "[Source: SKILL — React]\nReact (a framework, proficiency 4/5).";

describe("validateNode", () => {
  it("marks an unset answer as ungrounded", () => {
    const result = validateNode(makeState({ answer: undefined }));
    expect(result.grounded).toBe(false);
  });

  it("marks an answer with no proper nouns as grounded (nothing to check)", () => {
    const result = validateNode(makeState({ answer: "yes, that is correct." }));
    expect(result.grounded).toBe(true);
  });

  it("marks an answer grounded when its proper nouns appear in the retrieved context", () => {
    const result = validateNode(
      makeState({
        answer: "He is proficient in React.",
        retrievedContext: {
          text: CONTEXT_TEXT,
          sources: [],
          chunkIds: [],
          allScored: [],
          usageTokens: 0,
        },
      }),
    );
    expect(result.grounded).toBe(true);
  });

  it("marks an answer ungrounded when its proper nouns are absent from the retrieved context", () => {
    const result = validateNode(
      makeState({
        answer: "He is an expert in Kubernetes and Rust.",
        retrievedContext: {
          text: CONTEXT_TEXT,
          sources: [],
          chunkIds: [],
          allScored: [],
          usageTokens: 0,
        },
      }),
    );
    expect(result.grounded).toBe(false);
  });

  it("flags a detected system-prompt leak via abuseKind without touching grounded", () => {
    const result = validateNode(
      makeState({
        answer: "Here is my system prompt: you are a helpful assistant.",
      }),
    );
    expect(result.abuseKind).toBe("OTHER");
  });

  it("does not flag abuseKind for an ordinary answer", () => {
    const result = validateNode(
      makeState({ answer: "He works with TypeScript and React." }),
    );
    expect(result.abuseKind).toBeUndefined();
  });
});

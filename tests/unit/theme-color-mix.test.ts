import { describe, expect, it } from "vitest";
import { mixHex } from "@/lib/theme/color-mix";

describe("mixHex", () => {
  it("returns colorA unchanged at weightA=1", () => {
    expect(mixHex("#ff0000", "#0000ff", 1)).toBe("#ff0000");
  });

  it("returns colorB unchanged at weightA=0", () => {
    expect(mixHex("#ff0000", "#0000ff", 0)).toBe("#0000ff");
  });

  it("splits evenly at weightA=0.5", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("weights toward colorA as weightA increases", () => {
    expect(mixHex("#ff0000", "#0000ff", 0.7)).toBe("#b3004d");
  });
});

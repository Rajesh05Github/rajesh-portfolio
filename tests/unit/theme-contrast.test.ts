import { describe, expect, it } from "vitest";
import { getContrastColor } from "@/lib/theme/contrast";

describe("getContrastColor", () => {
  it("picks black text on a light background", () => {
    expect(getContrastColor("#ffffff")).toBe("#000000");
    expect(getContrastColor("#f5f5f5")).toBe("#000000");
  });

  it("picks white text on a dark background", () => {
    expect(getContrastColor("#000000")).toBe("#ffffff");
    expect(getContrastColor("#1a1a2e")).toBe("#ffffff");
  });

  it("expands a 3-digit hex before computing", () => {
    // #fff and #ffffff must resolve identically.
    expect(getContrastColor("#fff")).toBe(getContrastColor("#ffffff"));
    expect(getContrastColor("#000")).toBe(getContrastColor("#000000"));
  });

  it("accepts a hex value without the leading #", () => {
    expect(getContrastColor("ffffff")).toBe("#000000");
  });

  it("falls back to white text for malformed input rather than throwing", () => {
    expect(getContrastColor("not-a-color")).toBe("#ffffff");
    expect(getContrastColor("")).toBe("#ffffff");
  });
});

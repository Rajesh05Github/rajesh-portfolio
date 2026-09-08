import { test, expect } from "@playwright/test";

test.describe("resume/CV download", () => {
  test("the Download CV link, when present, serves a real PDF", async ({
    page,
    request,
  }) => {
    await page.goto("/");

    const downloadLink = page.getByRole("link", { name: "Download CV" });
    const isPresent = await downloadLink.isVisible().catch(() => false);

    // The Hero deliberately hides this button when no resume is active
    // (Phase 7) — a fresh seed/dev environment with nothing uploaded yet
    // is a legitimate state, not a failure, so this skips rather than fails.
    test.skip(
      !isPresent,
      "No active resume uploaded — nothing to download in this environment.",
    );

    const response = await request.get("/api/resume");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("application/pdf");
  });
});

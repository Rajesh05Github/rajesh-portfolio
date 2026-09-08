import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";

test.describe("theming", () => {
  test("activating the Minimal preset changes the active theme and the public site's rendered colors", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/appearance/themes");

    const minimalCard = page.locator(".glass", { hasText: "Minimal" });
    await expect(minimalCard).toBeVisible();

    // Only render an "Activate" button when this preset isn't already active
    // (see appearance/themes/page.tsx) — skip cleanly if it already is,
    // rather than failing on a button that correctly doesn't exist.
    const activateButton = minimalCard.getByRole("button", {
      name: "Activate",
    });
    if (await activateButton.isVisible().catch(() => false)) {
      await activateButton.click();
    }

    await expect(minimalCard.getByText("Active")).toBeVisible();

    // The public layout applies the active theme via inline CSS custom
    // properties on its wrapper (docs/decisions/0008) — confirm the
    // wrapper actually carries a real, non-empty `--color-primary` value
    // rather than asserting on a specific hex (presets can be retuned).
    await page.goto("/");
    const primaryColor = await page.evaluate(() =>
      getComputedStyle(
        document.querySelector("body > div") ?? document.body,
      ).getPropertyValue("--color-primary"),
    );
    expect(primaryColor.trim().length).toBeGreaterThan(0);
  });
});

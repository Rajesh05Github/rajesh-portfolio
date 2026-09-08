import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";

test.describe("admin content editing", () => {
  test("editing the About bio persists and reflects on the public site", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/about");

    const marker = `[E2E] Bio updated at ${Date.now()}`;
    await page.getByLabel("Bio").fill(marker);
    await page.getByRole("button", { name: "Save changes" }).click();

    // Server Action navigation/re-render — reload and confirm the textarea
    // shows the saved value, not just an optimistic client-side echo.
    await page.reload();
    await expect(page.getByLabel("Bio")).toHaveValue(marker);

    await page.goto("/");
    await expect(page.getByText(marker)).toBeVisible();
  });
});

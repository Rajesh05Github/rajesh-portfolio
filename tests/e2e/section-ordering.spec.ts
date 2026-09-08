import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";

test.describe("section ordering", () => {
  test("moving the second section up swaps its position with the first", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/layout/sections");

    const rows = page.locator("tbody tr");
    const firstLabel = await rows.nth(0).locator("td").nth(1).textContent();
    const secondLabel = await rows.nth(1).locator("td").nth(1).textContent();

    await rows.nth(1).getByRole("button", { name: "Move up" }).click();

    await expect(rows.nth(0).locator("td").nth(1)).toHaveText(
      secondLabel ?? "",
    );
    await expect(rows.nth(1).locator("td").nth(1)).toHaveText(firstLabel ?? "");

    // Restore the original order so this test is repeatable and doesn't
    // leave the admin's real section order permuted after every run.
    await rows.nth(0).getByRole("button", { name: "Move down" }).click();
    await expect(rows.nth(0).locator("td").nth(1)).toHaveText(firstLabel ?? "");
  });
});

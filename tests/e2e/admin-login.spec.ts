import { test, expect } from "@playwright/test";
import { E2E_ADMIN_EMAIL } from "./constants";
import { loginAsAdmin } from "./helpers/login";

test.describe("admin login", () => {
  test("rejects an incorrect password with an inline error, no navigation", async ({
    page,
  }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill("definitely-the-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("logs in with correct credentials and reaches the dashboard", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText(E2E_ADMIN_EMAIL)).toBeVisible();
  });

  test("redirects an unauthenticated visitor away from an admin page", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/admin/profile");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("logging out revokes the session — back button can't return to the dashboard", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

/** A dedicated e2e test admin account — never the site owner's real credentials. `global-setup.ts` upserts this user (against the real dev database, same one `npm run dev` uses) before the suite runs, so login tests never depend on whatever the current real admin password happens to be. */
export const E2E_ADMIN_EMAIL = "e2e-test@example.com";
export const E2E_ADMIN_PASSWORD = "e2e-test-password-123";

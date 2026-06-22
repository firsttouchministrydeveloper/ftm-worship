import { test, expect } from "@playwright/test";

test("invalid token shows error", async ({ page }) => {
  await page.goto("/invite/totally-fake-token-xyz");
  await expect(page.getByText(/invite has expired or is invalid/i)).toBeVisible();
});

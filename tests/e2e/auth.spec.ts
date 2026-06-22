import { test, expect } from "@playwright/test";

test("unauthenticated user is redirected from /dashboard to /signin", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/signin/);
});

test("sign-in page renders OAuth + magic link options", async ({ page }) => {
  await page.goto("/signin");
  await expect(page.getByRole("button", { name: /sign in with google/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in with apple/i })).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
});

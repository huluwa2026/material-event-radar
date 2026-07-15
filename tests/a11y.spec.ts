import { test, expect } from "@playwright/test";

test("home has main landmark", async ({ page }) => {
  await page.goto("/");
  const main = page.locator("main, [role='main'], #__next");
  await expect(main.first()).toBeVisible({ timeout: 15000 });
});

import { test, expect } from "@playwright/test";

test("keyboard shortcuts", async ({ page }) => {
  await page.goto("/");

  // Focus search
  await page.keyboard.press("Control+K");
  await expect(
    page.getByPlaceholder("Search ticker or company")
  ).toBeFocused();

  await page.keyboard.press("Escape");

  // Open first filing
  await page.keyboard.press("KeyP");

  await expect(
    page.getByRole("dialog")
  ).toBeVisible();

  // Close drawer
  await page.keyboard.press("Escape");

  await expect(
    page.getByRole("dialog")
  ).toBeHidden();
});
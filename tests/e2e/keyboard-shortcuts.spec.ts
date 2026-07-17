import { test, expect, type Page } from "@playwright/test";

const FIXTURE_DATE = "2026-07-13";

async function openFirstFiling(page: Page) {
  await page.goto(`/?date=${FIXTURE_DATE}`);
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByText(/filings shown/i)
  ).not.toContainText("0 filings shown");

  await page.locator("body").click();
  await page.keyboard.press("KeyO");

  await expect(
    page.getByRole("dialog")
  ).toBeVisible();
}

test("keyboard shortcuts", async ({ page }) => {
  await openFirstFiling(page);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog")
  ).toBeHidden();
});

test("navigate previous and next filing", async ({ page }) => {
  await openFirstFiling(page);

  const firstFiling = await page
    .getByRole("dialog")
    .innerText();

  await page.keyboard.press("Control+ArrowDown");

  const nextFiling = await page
    .getByRole("dialog")
    .innerText();

  expect(nextFiling).not.toBe(firstFiling);

  await page.keyboard.press("Control+ArrowUp");

  const previousFiling = await page
    .getByRole("dialog")
    .innerText();

  expect(previousFiling).toBe(firstFiling);
});
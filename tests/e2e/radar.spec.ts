import { expect, test } from "@playwright/test";

test("desktop radar loads real filings and opens grouped details", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?date=2026-07-13", { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: "Monday, July 13, 2026" })).toBeVisible();
  await expect(page.locator(".stat--primary strong")).toHaveText("13");
  await expect(page.locator(".event-row")).toHaveCount(13);
  await expect(page.getByText("Braskem S.A.")).toBeVisible();
  await expect(page.locator(".form-badge").filter({ hasText: "6-K" })).toHaveCount(1);

  const viewport = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);

  await page.screenshot({ path: "docs/material-event-radar.png", fullPage: true });

  const plugRow = page.locator(".event-row").filter({ hasText: "PLUG" });
  await plugRow.getByRole("button").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").locator(".drawer-section")).toHaveCount(2);
  await expect(page.getByText("Merged from 1 structured record")).toHaveCount(2);
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  expect(consoleErrors).toEqual([]);
});

test("mobile layout has no horizontal overflow and keeps filters usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?date=2026-07-13", { waitUntil: "networkidle" });

  await expect(page.locator(".event-row")).toHaveCount(13);
  await page.getByLabel("Search ticker or company").fill("NABL");
  await expect(page.locator(".event-row")).toHaveCount(1);
  await expect(page.getByText("Chief Revenue Officer transition")).toBeVisible();

  const viewport = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);

  await page.locator(".event-row").getByRole("button").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const drawerBox = await page.getByRole("dialog").boundingBox();
  expect(drawerBox?.width).toBeLessThanOrEqual(390.1);
  await page.screenshot({ path: "docs/material-event-radar-mobile.png", fullPage: false });
});

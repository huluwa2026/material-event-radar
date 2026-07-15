import { expect, test } from "@playwright/test";

test("desktop radar loads real filings and opens grouped details", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?date=2026-07-13&sparse=1", { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: "Monday, July 13, 2026" })).toBeVisible();
  await expect(page.locator(".stat--primary strong")).toHaveText("13");
  await expect(page.locator(".event-row")).toHaveCount(13);
  await expect(page.getByText("Braskem S.A.")).toBeVisible();
  await expect(page.locator(".form-badge").filter({ hasText: "6-K" })).toHaveCount(1);

  const viewport = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);

  await page.screenshot({ path: "docs/material-event-radar.png", fullPage: false });

  const plugRow = page.locator(".event-row").filter({ hasText: "PLUG" });
  await plugRow.getByRole("button", { name: "Open PLUG filing details" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").locator(".drawer-section")).toHaveCount(2);
  await expect(page.getByText("Merged from 1 structured record")).toHaveCount(2);
  await expect(page.getByText("Why this filing ranks here")).toBeVisible();
  await expect(page.getByText("company_deal_events").first()).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "docs/material-event-radar-detail.png", fullPage: false });
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  expect(consoleErrors).toEqual([]);
});

test("mobile layout has no horizontal overflow and keeps filters usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?date=2026-07-13&sparse=1", { waitUntil: "networkidle" });

  await expect(page.locator(".event-row")).toHaveCount(13);
  await page.getByLabel("Search ticker or company").fill("NABL");
  await expect(page.locator(".event-row")).toHaveCount(1);
  await expect(page.getByText("Chief Revenue Officer transition")).toBeVisible();

  const viewport = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);

  await page.locator(".event-row").getByRole("button", { name: "Open NABL filing details" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const drawerBox = await page.getByRole("dialog").boundingBox();
  expect(drawerBox?.width).toBeLessThanOrEqual(390.1);
  await page.waitForTimeout(300);
  await page.screenshot({ path: "docs/material-event-radar-mobile.png", fullPage: false });
});

test("shareable filters, timeline, watchlist, API, CSV, and RSS work together", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?date=2026-07-13&window=7&category=deal&sparse=1", { waitUntil: "networkidle" });

  await expect(page.getByText("7-day filing timeline")).toBeVisible();
  await expect(page.locator(".timeline-day")).toHaveCount(1);
  await expect(page).toHaveURL(/window=7/);
  await expect(page).toHaveURL(/category=deal/);

  const plug = page.locator(".event-row").filter({ hasText: "PLUG" });
  await plug.getByRole("button", { name: /Add PLUG to watchlist/ }).click();
  await page.getByText("Watchlist", { exact: true }).click();
  await expect(page.locator(".event-row")).toHaveCount(1);
  await expect(page).toHaveURL(/watchlist=1/);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".event-row")).toHaveCount(1);

  const json = await request.get("/api/v1/events?date=2026-07-13&window=7&category=deal");
  expect(json.ok()).toBe(true);
  const payload = await json.json();
  expect(payload.apiVersion).toBe("1");
  expect(payload.data.filings.length).toBeGreaterThan(0);
  expect(payload.data.filings[0].ranking.reasons.length).toBeGreaterThan(0);

  const csv = await request.get("/api/v1/events?date=2026-07-13&format=csv&sparse=1");
  expect(csv.ok()).toBe(true);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain("filing_date,ticker,company_name");

  const rss = await request.get("/feed.xml?date=2026-07-13&window=7&category=deal");
  expect(rss.ok()).toBe(true);
  expect(rss.headers()["content-type"]).toContain("application/rss+xml");
  expect(await rss.text()).toContain("<rss version=\"2.0\"");
});

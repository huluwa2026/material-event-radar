import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Automated accessibility scans on the fixture-backed daily list and an open
 * filing drawer. Runs without production credentials (dev:fixture webServer).
 */
test.describe("accessibility", () => {
  test("daily list has no critical or serious axe violations", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?date=2026-07-13&sparse=1", { waitUntil: "networkidle" });
    await expect(page.locator(".event-row")).toHaveCount(13);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const blocking = results.violations.filter((v) =>
      v.impact === "critical" || v.impact === "serious",
    );

    expect(blocking, formatViolations(blocking)).toEqual([]);
  });

  test("open filing drawer has no critical or serious axe violations", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?date=2026-07-13&sparse=1", { waitUntil: "networkidle" });

    const plugRow = page.locator(".event-row").filter({ hasText: "PLUG" });
    await plugRow.getByRole("button", { name: "Open PLUG filing details" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const blocking = results.violations.filter((v) =>
      v.impact === "critical" || v.impact === "serious",
    );

    expect(blocking, formatViolations(blocking)).toEqual([]);
  });
});

function formatViolations(
  violations: { id: string; impact?: string | null; help: string; nodes: { target: unknown[] }[] }[],
) {
  if (violations.length === 0) return "no violations";
  return violations
    .map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)`)
    .join("\n");
}

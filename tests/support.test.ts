import { TtlPromiseCache } from "@/lib/cache";
import { isValidDate, previousCompleteWeekday, shiftDate } from "@/lib/date";
import { parseSecFormType } from "@/lib/sec";
import { describe, expect, it, vi } from "vitest";

describe("date helpers", () => {
  it("validates calendar dates and shifts safely", () => {
    expect(isValidDate("2026-07-13")).toBe(true);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(shiftDate("2026-07-13", -1)).toBe("2026-07-12");
  });

  it("uses Friday as the complete date on Monday", () => {
    expect(previousCompleteWeekday(new Date("2026-07-13T16:00:00Z"))).toBe("2026-07-10");
  });
});

describe("SEC form parsing", () => {
  it("distinguishes 8-K and 6-K filing pages", () => {
    expect(parseSecFormType("<html><body><b>Form 8-K</b></body></html>")).toBe("8-K");
    expect(parseSecFormType("<table><tr><td>Form 6-K</td></tr></table>")).toBe("6-K");
    expect(parseSecFormType("Form 10-Q")).toBeNull();
  });
});

describe("TTL promise cache", () => {
  it("coalesces concurrent work for the same date", async () => {
    const cache = new TtlPromiseCache<number>(1_000);
    const factory = vi.fn(async () => 13);
    const [first, second] = await Promise.all([
      cache.getOrCreate("2026-07-13", factory),
      cache.getOrCreate("2026-07-13", factory),
    ]);
    expect(first).toBe(13);
    expect(second).toBe(13);
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

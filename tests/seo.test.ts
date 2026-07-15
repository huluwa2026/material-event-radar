import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  REPOSITORY_URL,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_TITLE,
  SITE_URL,
  STRUCTURED_DATA,
} from "@/lib/site";

describe("search discovery metadata", () => {
  it("uses a concise, descriptive title and summary", () => {
    expect(SITE_TITLE).toContain("SEC Filing Monitor");
    expect(SITE_TITLE.length).toBeLessThanOrEqual(60);
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(SITE_KEYWORDS).toEqual(expect.arrayContaining(["SEC filings", "8-K", "6-K", "EDGAR"]));
  });

  it("publishes crawl rules and the canonical sitemap", () => {
    expect(robots()).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: "/api/",
      },
      sitemap: `${SITE_URL}/sitemap.xml`,
      host: SITE_URL,
    });
    expect(sitemap()).toEqual([
      {
        url: SITE_URL,
        changeFrequency: "daily",
        priority: 1,
        images: [`${SITE_URL}/opengraph-image`],
      },
    ]);
  });

  it("describes the website and free open-source application without ratings", () => {
    const website = STRUCTURED_DATA["@graph"][0];
    const application = STRUCTURED_DATA["@graph"][1];

    expect(website["@type"]).toBe("WebSite");
    expect(application["@type"]).toBe("SoftwareApplication");
    expect(application.codeRepository).toBe(REPOSITORY_URL);
    expect(application.isAccessibleForFree).toBe(true);
    expect(application.offers).toMatchObject({ price: "0", priceCurrency: "USD" });
    expect(application).not.toHaveProperty("aggregateRating");
  });
});

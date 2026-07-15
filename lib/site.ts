export const SITE_NAME = "Material Event Radar";
export const SITE_TITLE = `${SITE_NAME} — Auditable SEC Filing Monitor`;
export const SITE_URL = "https://material-event-radar.vercel.app";
export const REPOSITORY_URL = "https://github.com/huluwa2026/material-event-radar";
export const SITE_DESCRIPTION =
  "Open-source SEC filing monitor for material company events in 8-K and 6-K disclosures, with source links, audit trails, JSON, CSV, and RSS.";

export const SITE_KEYWORDS = [
  "SEC filings",
  "SEC filing monitor",
  "8-K",
  "6-K",
  "material events",
  "EDGAR",
  "financial data",
  "company disclosures",
  "RSS feed",
  "JSON API",
  "CSV export",
];

export const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: "SEC Filing Event Radar",
      description: SITE_DESCRIPTION,
      inLanguage: "en",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#application`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      softwareVersion: "0.1.0",
      codeRepository: REPOSITORY_URL,
      license: `${REPOSITORY_URL}/blob/main/LICENSE`,
      featureList: [
        "SEC filing event grouping",
        "Original disclosure links",
        "Deterministic ranking and audit trails",
        "Local ticker watchlists",
        "Filtered JSON, CSV, and RSS outputs",
      ],
      author: {
        "@type": "Person",
        name: "huluwa2026",
        url: "https://github.com/huluwa2026",
      },
      sameAs: REPOSITORY_URL,
    },
  ],
} as const;

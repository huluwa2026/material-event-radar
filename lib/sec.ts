import { TtlPromiseCache } from "@/lib/cache";
import type { MaterialFiling, SecMetadata } from "@/lib/types";
import { DomUtils, parseDocument } from "htmlparser2";

const cacheSeconds = Number(process.env.SEC_METADATA_CACHE_TTL_SECONDS || 604_800);
const metadataCache = new TtlPromiseCache<SecMetadata>(Math.max(60, cacheSeconds) * 1000);

function extractVisibleText(value: string): string {
  const document = parseDocument(value, { decodeEntities: true });
  const hiddenElements = new Set(["script", "style", "noscript", "template"]);

  for (const element of DomUtils.findAll((candidate) => hiddenElements.has(candidate.name), document.children)) {
    DomUtils.removeElement(element);
  }

  return DomUtils.textContent(document).replace(/\s+/g, " ");
}

export function parseSecFormType(html: string): string | null {
  const text = extractVisibleText(html);
  const match = text.match(/\bForm\s+(8-K(?:\/A)?|6-K(?:\/A)?)\b/i);
  return match ? match[1].toUpperCase() : null;
}

async function fetchMetadata(filing: MaterialFiling): Promise<SecMetadata> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(filing.secUrl, {
      headers: {
        "User-Agent": process.env.SEC_USER_AGENT || "material-event-radar/0.1 open-source research app",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) return { formType: filing.formType, accessible: false };
    const html = await response.text();
    return { formType: parseSecFormType(html) || filing.formType, accessible: true };
  } catch {
    return { formType: filing.formType, accessible: null };
  } finally {
    clearTimeout(timeout);
  }
}

export async function attachSecMetadata(filings: MaterialFiling[]): Promise<MaterialFiling[]> {
  const results: MaterialFiling[] = new Array(filings.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < filings.length) {
      const index = cursor++;
      const filing = filings[index];
      const metadata = await metadataCache.getOrCreate(filing.secUrl, () => fetchMetadata(filing));
      results[index] = {
        ...filing,
        formType: metadata.formType,
        secAccessible: metadata.accessible,
      };
    }
  }

  await Promise.all(Array.from({ length: Math.min(5, filings.length) }, () => worker()));
  return results;
}

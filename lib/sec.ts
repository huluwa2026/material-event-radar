import { TtlPromiseCache } from "@/lib/cache";
import type { MaterialFiling, SecMetadata } from "@/lib/types";

const cacheSeconds = Number(process.env.SEC_METADATA_CACHE_TTL_SECONDS || 604_800);
const metadataCache = new TtlPromiseCache<SecMetadata>(Math.max(60, cacheSeconds) * 1000);

function decodeHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ");
}

export function parseSecFormType(html: string): string | null {
  const text = decodeHtml(html);
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

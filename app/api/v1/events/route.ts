import { isValidDate, previousCompleteWeekday } from "@/lib/date";
import { DrillrConfigurationError, DrillrRequestError } from "@/lib/drillr";
import { filterFilings, filingsToCsv, parseFilters, parseWindow, publicRadarData } from "@/lib/public-api";
import { getRadarWindow } from "@/lib/radar";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requestKey(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rate = checkRateLimit(requestKey(request));
  const rateHeaders = rateLimitHeaders(rate);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Try again after the rate-limit window resets." } },
      { status: 429, headers: { ...rateHeaders, "Retry-After": "60" } },
    );
  }

  const params = request.nextUrl.searchParams;
  const date = params.get("date") || previousCompleteWeekday();
  const windowDays = parseWindow(params.get("window"));
  const format = params.get("format") || "json";
  if (!isValidDate(date)) {
    return NextResponse.json(
      { error: { code: "invalid_date", message: "Use an ISO filing date in YYYY-MM-DD format." } },
      { status: 400, headers: rateHeaders },
    );
  }
  if (!windowDays) {
    return NextResponse.json(
      { error: { code: "invalid_window", message: "Window must be 1, 7, or 30 days." } },
      { status: 400, headers: rateHeaders },
    );
  }
  if (format !== "json" && format !== "csv") {
    return NextResponse.json(
      { error: { code: "invalid_format", message: "Format must be json or csv." } },
      { status: 400, headers: rateHeaders },
    );
  }

  try {
    const filters = parseFilters(params);
    const radar = await getRadarWindow(date, windowDays);
    const filings = filterFilings(radar.filings, filters);
    const cacheHeaders = {
      ...rateHeaders,
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    };

    if (format === "csv") {
      return new NextResponse(filingsToCsv(filings), {
        headers: {
          ...cacheHeaders,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="material-events-${radar.fromDate}-to-${radar.date}.csv"`,
        },
      });
    }

    return NextResponse.json(
      {
        apiVersion: "1",
        query: { date, window: windowDays, ...filters },
        meta: {
          generatedAt: radar.fetchedAt,
          source: radar.source,
          sourceRowCount: radar.sourceRowCount,
          totalFilings: radar.filings.length,
          returnedFilings: filings.length,
        },
        data: publicRadarData(radar, filings),
      },
      { headers: cacheHeaders },
    );
  } catch (error) {
    if (error instanceof DrillrConfigurationError) {
      return NextResponse.json(
        { error: { code: "server_not_configured", message: "The server-side Drillr API key is not configured." } },
        { status: 503, headers: rateHeaders },
      );
    }
    if (error instanceof DrillrRequestError) {
      return NextResponse.json(
        { error: { code: "upstream_unavailable", message: error.message } },
        { status: 502, headers: rateHeaders },
      );
    }
    console.error("Versioned events API failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: { code: "internal_error", message: "The event radar could not be loaded." } },
      { status: 500, headers: rateHeaders },
    );
  }
}


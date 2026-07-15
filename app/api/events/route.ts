import { isValidDate } from "@/lib/date";
import { DrillrConfigurationError, DrillrRequestError } from "@/lib/drillr";
import { isPublicDateAllowed, publicDefaultDate, publicFilingLimit } from "@/lib/public-access";
import { checkPublicRequest } from "@/lib/public-request";
import { getDailyRadar } from "@/lib/radar";
import { rateLimitHeaders } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rate = checkPublicRequest(request);
  const rateHeaders = rateLimitHeaders(rate);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Try again after the rate-limit window resets." } },
      { status: 429, headers: { ...rateHeaders, "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const requested = request.nextUrl.searchParams.get("date");
  const date = requested || publicDefaultDate();

  if (!isValidDate(date)) {
    return NextResponse.json(
      { error: { code: "invalid_date", message: "Use an ISO filing date in YYYY-MM-DD format." } },
      { status: 400, headers: rateHeaders },
    );
  }
  if (!isPublicDateAllowed(date)) {
    return NextResponse.json(
      {
        error: {
          code: "historical_date_unavailable",
          message: `This hosted deployment serves rolling windows ending on ${publicDefaultDate()}.`,
        },
      },
      { status: 403, headers: rateHeaders },
    );
  }

  try {
    const radar = await getDailyRadar(date);
    const filings = radar.filings.slice(0, publicFilingLimit());
    return NextResponse.json({ ...radar, filings }, {
      headers: {
        ...rateHeaders,
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    if (error instanceof DrillrConfigurationError) {
      return NextResponse.json(
        {
          error: {
            code: "server_not_configured",
            message: "This deployment has not configured its server-side Drillr API key.",
          },
        },
        { status: 503, headers: rateHeaders },
      );
    }

    if (error instanceof DrillrRequestError) {
      return NextResponse.json(
        { error: { code: "upstream_unavailable", message: error.message } },
        { status: 502, headers: rateHeaders },
      );
    }

    console.error("Material Event Radar request failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: { code: "internal_error", message: "The event radar could not be loaded." } },
      { status: 500, headers: rateHeaders },
    );
  }
}

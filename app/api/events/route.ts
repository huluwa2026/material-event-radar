import { isValidDate, previousCompleteWeekday } from "@/lib/date";
import { DrillrConfigurationError, DrillrRequestError } from "@/lib/drillr";
import { getDailyRadar } from "@/lib/radar";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requested = request.nextUrl.searchParams.get("date");
  const date = requested || previousCompleteWeekday();

  if (!isValidDate(date)) {
    return NextResponse.json(
      { error: { code: "invalid_date", message: "Use an ISO filing date in YYYY-MM-DD format." } },
      { status: 400 },
    );
  }

  try {
    const radar = await getDailyRadar(date);
    return NextResponse.json(radar, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=300",
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
        { status: 503 },
      );
    }

    if (error instanceof DrillrRequestError) {
      return NextResponse.json(
        { error: { code: "upstream_unavailable", message: error.message } },
        { status: 502 },
      );
    }

    console.error("Material Event Radar request failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: { code: "internal_error", message: "The event radar could not be loaded." } },
      { status: 500 },
    );
  }
}

import { isFixtureMode } from "@/lib/drillr";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  const mode = isFixtureMode() ? "fixture" : "live";
  const configured = mode === "fixture" || Boolean(process.env.DRILLR_API_KEY);
  return NextResponse.json(
    {
      status: configured ? "ok" : "degraded",
      service: "material-event-radar",
      mode,
      upstreamConfigured: configured,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || "local",
      checkedAt: new Date().toISOString(),
    },
    {
      status: configured ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}


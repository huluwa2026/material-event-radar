import { checkRateLimit } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

export function checkPublicRequest(request: NextRequest) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  return checkRateLimit(address);
}

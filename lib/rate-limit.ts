interface RateRecord {
  count: number;
  resetAt: number;
}

const requests = new Map<string, RateRecord>();
const LIMIT = 60;
const WINDOW_MS = 60_000;

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  let record = requests.get(key);
  if (!record || record.resetAt <= now) {
    record = { count: 0, resetAt: now + WINDOW_MS };
  }
  record.count += 1;
  requests.set(key, record);

  if (requests.size > 1_000) {
    for (const [candidate, value] of requests) {
      if (value.resetAt <= now) requests.delete(candidate);
    }
  }

  return {
    allowed: record.count <= LIMIT,
    limit: LIMIT,
    remaining: Math.max(0, LIMIT - record.count),
    resetAt: record.resetAt,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}


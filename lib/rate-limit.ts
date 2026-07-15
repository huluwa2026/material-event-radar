interface RateRecord {
  minuteCount: number;
  minuteResetAt: number;
  dailyCount: number;
  dailyResetAt: number;
}

const requests = new Map<string, RateRecord>();
const configuredLimit = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const MINUTE_LIMIT = configuredLimit(process.env.PUBLIC_RATE_LIMIT_PER_MINUTE, 20);
const DAILY_LIMIT = configuredLimit(process.env.PUBLIC_RATE_LIMIT_PER_DAY, 200);
const MINUTE_MS = 60_000;
const DAILY_MS = 86_400_000;

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  dailyLimit: number;
  dailyRemaining: number;
  dailyResetAt: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, now = Date.now()): RateLimitResult {
  let record = requests.get(key);
  if (!record) {
    record = {
      minuteCount: 0,
      minuteResetAt: now + MINUTE_MS,
      dailyCount: 0,
      dailyResetAt: now + DAILY_MS,
    };
  }
  if (record.minuteResetAt <= now) {
    record.minuteCount = 0;
    record.minuteResetAt = now + MINUTE_MS;
  }
  if (record.dailyResetAt <= now) {
    record.dailyCount = 0;
    record.dailyResetAt = now + DAILY_MS;
  }
  record.minuteCount += 1;
  record.dailyCount += 1;
  requests.set(key, record);

  if (requests.size > 1_000) {
    for (const [candidate, value] of requests) {
      if (value.dailyResetAt <= now) requests.delete(candidate);
    }
  }

  const minuteAllowed = record.minuteCount <= MINUTE_LIMIT;
  const dailyAllowed = record.dailyCount <= DAILY_LIMIT;
  const resetAt = dailyAllowed ? record.minuteResetAt : record.dailyResetAt;

  return {
    allowed: minuteAllowed && dailyAllowed,
    limit: MINUTE_LIMIT,
    remaining: Math.max(0, MINUTE_LIMIT - record.minuteCount),
    resetAt: record.minuteResetAt,
    dailyLimit: DAILY_LIMIT,
    dailyRemaining: Math.max(0, DAILY_LIMIT - record.dailyCount),
    dailyResetAt: record.dailyResetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    "X-RateLimit-Daily-Limit": String(result.dailyLimit),
    "X-RateLimit-Daily-Remaining": String(result.dailyRemaining),
    "X-RateLimit-Daily-Reset": String(Math.ceil(result.dailyResetAt / 1000)),
  };
}

export function clearRateLimits(): void {
  requests.clear();
}

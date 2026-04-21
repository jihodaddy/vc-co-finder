import 'server-only';

/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Used by the DSAR form (Plan 06) to cap submissions at N/hour per IP.
 *
 * Caveats (intentional — Phase 1 scope):
 *   - Process-local Map. Vercel warm-instance preserves state across requests
 *     during the same container lifetime; cold-starts flush. Worst case: 2×
 *     the intended limit. Acceptable for Phase 1 DSAR volume.
 *   - Not distributed. Multiple concurrent serverless containers will each
 *     track independent counters.
 *
 * Upgrade path: swap this module for an Upstash Redis counter when we add
 * authenticated rate limits (Phase 4c) or observe > 1 req/sec sustained
 * abuse against DSAR. Keep the `rateLimit(key, limit) -> { ok, remaining,
 * resetAt }` contract so callers do not change.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function rateLimit(
  key: string,
  limit: number
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + WINDOW_MS;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }
  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  }
  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

// Best-effort cleanup so the Map does not grow unboundedly on a long-lived
// warm instance. Setting this at module load is safe — it runs once per
// container lifetime, and `setInterval` is tolerated by Node/Vercel runtimes.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, 10 * 60 * 1000);
}

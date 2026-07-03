/**
 * In-memory sliding-window rate limiter.
 * Suitable for single-instance dev/preview; use Redis or edge limiting in multi-instance production.
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

const store = new Map<string, RateLimitEntry>();

function pruneStaleEntries(now: number, windowMs: number) {
  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const { windowMs, max } = options;
  const cutoff = now - windowMs;

  pruneStaleEntries(now, windowMs);

  const entry = store.get(key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

  if (entry.timestamps.length >= max) {
    const oldestInWindow = entry.timestamps[0]!;
    store.set(key, entry);
    return {
      allowed: false,
      retryAfterMs: oldestInWindow + windowMs - now,
    };
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return { allowed: true };
}

export function getClientIp(request: Request, clientAddress?: string): string {
  if (clientAddress) return clientAddress;

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]!.trim();
  }

  return 'unknown';
}

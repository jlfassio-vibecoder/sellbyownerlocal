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

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const { windowMs, max } = options;
  const cutoff = now - windowMs;

  const existing = store.get(key);
  const timestamps = (existing?.timestamps ?? []).filter((ts) => ts > cutoff);

  if (timestamps.length >= max) {
    const oldestInWindow = timestamps[0]!;
    store.set(key, { timestamps });
    return {
      allowed: false,
      retryAfterMs: oldestInWindow + windowMs - now,
    };
  }

  timestamps.push(now);
  store.set(key, { timestamps });

  return { allowed: true };
}

export function getClientIp(request: Request, clientAddress?: string): string {
  if (clientAddress) return clientAddress;

  if (process.env.TRUST_PROXY === 'true') {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0]!.trim();
    }
  }

  return 'unknown';
}

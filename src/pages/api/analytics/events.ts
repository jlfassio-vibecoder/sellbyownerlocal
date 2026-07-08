import type { APIRoute } from 'astro';
import { AnalyticsVehicleNotFoundError, recordListingEvent } from '../../../lib/analytics';
import { getAnonSessionId } from '../../../lib/analytics-session';
import { checkRateLimit, getClientIp } from '../../../lib/rate-limit';
import { ListingEventCreateSchema } from '../../../schemas';

const ANALYTICS_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  max: 120,
};

const PAGE_VIEW_RATE_LIMIT = {
  windowMs: 24 * 60 * 60 * 1000,
  max: 1,
};

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  try {
    const sessionId = getAnonSessionId(cookies);
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Missing anonymous session' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const clientIp = getClientIp(request, clientAddress);
    const rateLimit = checkRateLimit(`analytics:ip:${clientIp}`, ANALYTICS_RATE_LIMIT);

    if (!rateLimit.allowed) {
      const retryAfterSeconds = Math.ceil(
        (rateLimit.retryAfterMs ?? ANALYTICS_RATE_LIMIT.windowMs) / 1000
      );
      return new Response(JSON.stringify({ error: 'Too many events. Please try again later.' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSeconds),
        },
      });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const parsed = ListingEventCreateSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { vehicleId, eventType, metadata } = parsed.data;

    if (eventType === 'page_view') {
      const pageViewLimit = checkRateLimit(
        `analytics:pv:${sessionId}:${vehicleId}`,
        PAGE_VIEW_RATE_LIMIT
      );

      if (!pageViewLimit.allowed) {
        return new Response(JSON.stringify({ ok: true, deduplicated: true }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    await recordListingEvent({
      sessionId,
      vehicleId,
      eventType,
      metadata,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AnalyticsVehicleNotFoundError) {
      return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.error('POST /api/analytics/events failed', error);
    return new Response(JSON.stringify({ error: 'Failed to record event' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

import type { APIRoute } from 'astro';
import { auth, db } from '../../lib/firebase-admin';

const CACHE_TTL_MS = 60_000;

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=60, s-maxage=60',
};

type ServiceStatus = 'operational' | 'outage';

type ServiceResult = {
  status: ServiceStatus;
  latencyMs: number;
};

type HealthResponse = {
  ok: boolean;
  checkedAt: string;
  services: {
    database: ServiceResult;
    authentication: ServiceResult;
    messaging: ServiceResult;
  };
};

type HealthCache = {
  payload: HealthResponse;
  cachedAt: number;
};

let healthCache: HealthCache | null = null;
let inFlightProbe: Promise<HealthResponse> | null = null;

async function timedProbe(probe: () => Promise<void>): Promise<ServiceResult> {
  const started = Date.now();
  try {
    await probe();
    return { status: 'operational', latencyMs: Date.now() - started };
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code: unknown }).code)
        : 'unknown';
    console.error('GET /api/health probe failed', code);
    return { status: 'outage', latencyMs: Date.now() - started };
  }
}

function isAuthReachableError(error: unknown): boolean {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  return code === 'auth/user-not-found';
}

async function probeAuthentication(): Promise<void> {
  try {
    await auth().getUser('__health_probe__');
  } catch (error) {
    if (isAuthReachableError(error)) {
      return;
    }
    throw error;
  }
}

async function runHealthProbes(): Promise<HealthResponse> {
  const [database, authentication, messaging] = await Promise.all([
    timedProbe(() => db().collection('_health').limit(1).get().then(() => undefined)),
    timedProbe(probeAuthentication),
    timedProbe(() => db().collection('messages').limit(1).get().then(() => undefined)),
  ]);

  const services = { database, authentication, messaging };
  const ok = Object.values(services).every((service) => service.status === 'operational');

  return {
    ok,
    checkedAt: new Date().toISOString(),
    services,
  };
}

function jsonResponse(payload: HealthResponse): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: RESPONSE_HEADERS,
  });
}

export const GET: APIRoute = async () => {
  const now = Date.now();

  if (healthCache && now - healthCache.cachedAt < CACHE_TTL_MS) {
    return jsonResponse(healthCache.payload);
  }

  if (!inFlightProbe) {
    inFlightProbe = runHealthProbes()
      .then((payload) => {
        healthCache = { payload, cachedAt: Date.now() };
        return payload;
      })
      .finally(() => {
        inFlightProbe = null;
      });
  }

  const payload = await inFlightProbe;
  return jsonResponse(payload);
};

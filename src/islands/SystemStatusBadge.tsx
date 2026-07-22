import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

const HEARTBEAT_MS = 30_000;

type ServiceStatus = 'operational' | 'outage';

type ServerServiceKey = 'database' | 'authentication' | 'messaging';

type HealthResponse = {
  ok: boolean;
  checkedAt: string;
  services: Record<ServerServiceKey, { status: ServiceStatus; latencyMs: number }>;
};

type SubsystemKey = 'network' | ServerServiceKey;

type SubsystemMap = Record<SubsystemKey, ServiceStatus>;

const SUBSYSTEM_LABELS: Record<SubsystemKey, string> = {
  network: 'Network',
  database: 'Database',
  authentication: 'Authentication',
  messaging: 'Messaging',
};

const SUBSYSTEM_ORDER: SubsystemKey[] = [
  'network',
  'database',
  'authentication',
  'messaging',
];

function allOutage(network: ServiceStatus): SubsystemMap {
  return {
    network,
    database: 'outage',
    authentication: 'outage',
    messaging: 'outage',
  };
}

async function fetchHealth(): Promise<HealthResponse | null> {
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as HealthResponse;
  } catch {
    return null;
  }
}

function mergeServices(
  browserOnline: boolean,
  health: HealthResponse | null
): SubsystemMap {
  const network: ServiceStatus = browserOnline ? 'operational' : 'outage';

  if (!browserOnline) {
    return {
      network,
      database: 'outage',
      authentication: 'outage',
      messaging: 'outage',
    };
  }

  if (!health?.services) {
    return allOutage(network);
  }

  return {
    network,
    database: health.services.database?.status ?? 'outage',
    authentication: health.services.authentication?.status ?? 'outage',
    messaging: health.services.messaging?.status ?? 'outage',
  };
}

export default function SystemStatusBadge() {
  const [services, setServices] = useState<SubsystemMap>(() => ({
    network: typeof navigator !== 'undefined' && !navigator.onLine ? 'outage' : 'operational',
    database: 'operational',
    authentication: 'operational',
    messaging: 'operational',
  }));

  useEffect(() => {
    let cancelled = false;

    const syncStatus = async () => {
      const browserOnline = navigator.onLine;
      if (!browserOnline) {
        if (!cancelled) {
          setServices({
            network: 'outage',
            database: 'outage',
            authentication: 'outage',
            messaging: 'outage',
          });
        }
        return;
      }

      const health = await fetchHealth();
      if (!cancelled) {
        setServices(mergeServices(true, health));
      }
    };

    const handleOnline = () => {
      void syncStatus();
    };
    const handleOffline = () => {
      setServices({
        network: 'outage',
        database: 'outage',
        authentication: 'outage',
        messaging: 'outage',
      });
    };

    void syncStatus();
    const intervalId = window.setInterval(() => {
      void syncStatus();
    }, HEARTBEAT_MS);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <ul
      role="status"
      aria-live="polite"
      aria-label="System status"
      className="flex shrink-0 flex-col gap-1.5 text-sm font-medium"
    >
      {SUBSYSTEM_ORDER.map((key) => {
        const status = services[key];
        const isOperational = status === 'operational';
        return (
          <li
            key={key}
            className={`flex items-center gap-2 ${
              isOperational ? 'text-slate-700' : 'text-red-700'
            }`}
          >
            {isOperational ? (
              <CheckCircle2 size={14} className="shrink-0 text-green-500" aria-hidden="true" />
            ) : (
              <XCircle size={14} className="shrink-0 text-red-500" aria-hidden="true" />
            )}
            <span>
              {SUBSYSTEM_LABELS[key]}
              <span className="sr-only">
                {isOperational ? ': Operational' : ': Outage'}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

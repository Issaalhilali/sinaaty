/** Pure domain value describing service health. No framework imports allowed here. */
export type DependencyStatus = 'up' | 'down' | 'skipped';

export interface HealthReport {
  status: 'ok' | 'degraded';
  service: 'api';
  version: string;
  env: string;
  uptime_seconds: number;
  timestamp: string;
  dependencies: Record<string, DependencyStatus>;
}

export function buildHealthReport(input: {
  version: string;
  env: string;
  uptimeSeconds: number;
  now: Date;
  dependencies: Record<string, DependencyStatus>;
}): HealthReport {
  const anyDown = Object.values(input.dependencies).some((s) => s === 'down');
  return {
    status: anyDown ? 'degraded' : 'ok',
    service: 'api',
    version: input.version,
    env: input.env,
    uptime_seconds: Math.round(input.uptimeSeconds),
    timestamp: input.now.toISOString(),
    dependencies: input.dependencies,
  };
}

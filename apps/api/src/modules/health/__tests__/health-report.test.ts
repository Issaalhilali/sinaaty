import { buildHealthReport } from '../domain/health-report';

describe('buildHealthReport (domain)', () => {
  const base = { version: '1.0.0', env: 'test', uptimeSeconds: 12.7, now: new Date('2026-08-17T10:00:00Z') };

  it('is ok when every dependency is up or skipped', () => {
    const r = buildHealthReport({ ...base, dependencies: { postgres: 'up', redis: 'skipped' } });
    expect(r.status).toBe('ok');
    expect(r.uptime_seconds).toBe(13);
    expect(r.timestamp).toBe('2026-08-17T10:00:00.000Z');
  });

  it('is degraded when any dependency is down', () => {
    const r = buildHealthReport({ ...base, dependencies: { postgres: 'down' } });
    expect(r.status).toBe('degraded');
  });
});

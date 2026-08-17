import { Inject, Injectable } from '@nestjs/common';
import { buildHealthReport, type HealthReport } from '../domain/health-report';
import { DEPENDENCY_PROBES, type DependencyProbe } from './health-check.port';
import { AppConfig } from '../../../config';

@Injectable()
export class GetHealthUseCase {
  constructor(
    @Inject(DEPENDENCY_PROBES) private readonly probes: DependencyProbe[],
    private readonly config: AppConfig,
  ) {}

  /** Liveness: process is up. Never touches dependencies. */
  live(): HealthReport {
    return this.report({});
  }

  /** Readiness: probes dependencies (db, later redis/queues). */
  async ready(): Promise<HealthReport> {
    const entries = await Promise.all(this.probes.map(async (p) => [p.name, await p.probe()] as const));
    return this.report(Object.fromEntries(entries));
  }

  private report(dependencies: HealthReport['dependencies']): HealthReport {
    return buildHealthReport({
      version: process.env['npm_package_version'] ?? '0.0.1',
      env: this.config.get('APP_ENV'),
      uptimeSeconds: process.uptime(),
      now: new Date(),
      dependencies,
    });
  }
}

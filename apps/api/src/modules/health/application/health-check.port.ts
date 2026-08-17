import type { DependencyStatus } from '../domain/health-report';

/** Port: how the application asks about a dependency. Implemented in infrastructure/. */
export interface DependencyProbe {
  readonly name: string;
  probe(): Promise<DependencyStatus>;
}
export const DEPENDENCY_PROBES = Symbol('DEPENDENCY_PROBES');

import { Injectable } from '@nestjs/common';
import { haversineKm, type GeoPoint } from '../../domain/transport';
import type { MapsPort, RouteResult } from '../../application/ports/maps.port';
/**
 * Mock routing: straight-line distance × a road factor (city streets are never straight),
 * and an ETA from an average city speed. Deterministic, so tests can assert on it.
 * Documented in docs/integrations/maps.md.
 */
@Injectable()
export class MapsMockAdapter implements MapsPort {
  private static readonly ROAD_FACTOR = 1.35;
  private static readonly AVG_SPEED_KMH = 38;
  route(from: GeoPoint, to: GeoPoint): Promise<RouteResult> {
    const distanceKm = Math.round(haversineKm(from, to) * MapsMockAdapter.ROAD_FACTOR * 100) / 100;
    return Promise.resolve({ distanceKm, durationMinutes: Math.max(5, Math.round((distanceKm / MapsMockAdapter.AVG_SPEED_KMH) * 60)), source: 'mock' });
  }
}

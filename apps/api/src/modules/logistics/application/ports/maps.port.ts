import type { GeoPoint } from '../../domain/transport';
export interface RouteResult { distanceKm: number; durationMinutes: number; source: 'mock' | 'provider' }
/** Anti-corruption layer for the maps provider (Google/Mapbox later) — the domain only knows distance + ETA. */
export interface MapsPort { route(from: GeoPoint, to: GeoPoint): Promise<RouteResult> }
export const MAPS_PORT = Symbol('MAPS_PORT');

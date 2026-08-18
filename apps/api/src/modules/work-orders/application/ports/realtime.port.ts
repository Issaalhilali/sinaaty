/** Application-side port for pushing live updates; implemented by the Socket.IO gateway (interface/ws). */
export interface RealtimePublisher { publish(channel: string, event: string, payload: unknown): void }
export const REALTIME_PUBLISHER = Symbol('REALTIME_PUBLISHER');

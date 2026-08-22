import type { AuthUser } from '../../../identity/domain/auth-user';

/** Application-side port for pushing live updates; implemented by the Socket.IO gateway (interface/ws). */
export type ChannelAccessChecker = (entityId: string, user: AuthUser) => Promise<boolean>;
export interface RealtimePublisher {
  publish(channel: string, event: string, payload: unknown): void;
  /** Other modules register how to authorize joining `prefix:{uuid}` channels (e.g. 'service-request'). */
  registerChannel?(prefix: string, checker: ChannelAccessChecker): void;
}
export const REALTIME_PUBLISHER = Symbol('REALTIME_PUBLISHER');

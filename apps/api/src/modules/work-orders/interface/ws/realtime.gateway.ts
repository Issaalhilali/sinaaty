import { Inject, Injectable } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { TOKEN_PORT, type TokenPort } from '../../../identity/application/ports/token.port';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { WORK_ORDER_REPOSITORY, type WorkOrderRepository } from '../../domain/repositories';
import { isCustomer, isStaff, isWorkshopMember } from '../../domain/work-order';
import type { RealtimePublisher } from '../../application/ports/realtime.port';

/**
 * Socket.IO namespace /realtime. Client: io('/realtime', { auth: { token } }) → emit('subscribe', { channel: 'work-order:<id>' }).
 * Access is checked per channel (customer / workshop member / staff). Server pushes: status | item | inspection | media.
 */
@Injectable()
@WebSocketGateway({ namespace: '/realtime', cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection, RealtimePublisher {
  @WebSocketServer() server!: Server;
  constructor(@Inject(TOKEN_PORT) private readonly tokens: TokenPort, @Inject(WORK_ORDER_REPOSITORY) private readonly repo: WorkOrderRepository) {}

  async handleConnection(client: Socket) {
    const token = (client.handshake.auth as { token?: string })?.token ?? (client.handshake.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    try { (client.data as { user?: AuthUser }).user = await this.tokens.verifyAccess(token); } catch { client.emit('error', { code: 'UNAUTHORIZED' }); client.disconnect(true); }
  }
  @SubscribeMessage('subscribe')
  async subscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { channel?: string }) {
    const user = (client.data as { user?: AuthUser }).user; const channel = body?.channel ?? '';
    const m = /^work-order:([0-9a-f-]{36})$/i.exec(channel);
    if (!user || !m) return { ok: false, code: 'FORBIDDEN', channel };
    const wo = await this.repo.findById(m[1]!);
    if (!wo || !(isWorkshopMember(wo, user) || isCustomer(wo, user) || isStaff(user))) return { ok: false, code: 'FORBIDDEN', channel };
    await client.join(channel); return { ok: true, channel };
  }
  @SubscribeMessage('unsubscribe')
  async unsubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { channel?: string }) { if (body?.channel) await client.leave(body.channel); return { ok: true }; }
  publish(channel: string, event: string, payload: unknown): void { this.server?.to(channel).emit(event, payload); }
}

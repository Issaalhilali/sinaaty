import { Inject, Injectable } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { TOKEN_PORT, type TokenPort } from '../../../identity/application/ports/token.port';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { WORK_ORDER_REPOSITORY, type WorkOrderRepository } from '../../domain/repositories';
import { isCustomer, isStaff, isWorkshopMember } from '../../domain/work-order';
import type { ChannelAccessChecker, RealtimePublisher } from '../../application/ports/realtime.port';

/**
 * Socket.IO namespace /realtime. Client: io('/realtime', { auth: { token } }) → emit('subscribe', { channel: 'work-order:<id>' }).
 * Access is checked per channel (customer / workshop member / staff). Server pushes: status | item | inspection | media.
 */
@Injectable()
@WebSocketGateway({ namespace: '/realtime', cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayInit, RealtimePublisher {
  @WebSocketServer() server!: Server;
  private readonly channelAccess = new Map<string, ChannelAccessChecker>();
  constructor(@Inject(TOKEN_PORT) private readonly tokens: TokenPort, @Inject(WORK_ORDER_REPOSITORY) private readonly repo: WorkOrderRepository) {}

  /**
   * التحقّق في وسيط المصافحة لا بعد الاتصال: `handleConnection` غير متزامنة، فالعميل الذي يشترك
   * فور `connect` كان يُردّ بـFORBIDDEN لأن رمزه لم يكن قد تحقّق بعد — سباقٌ يظهر كـ«ليست لديك
   * صلاحية» على قناة يملكها صاحبها. الوسيط يمنع قيام الاتصال أصلاً قبل أن يُعرف صاحبه.
   */
  afterInit(server: Server) {
    // الوسيط نفسه متزامن و`verify` هي التي تنتظر: تمرير `async` حيث يُنتظر `void` يجعل أي رفضٍ
    // غير مُمسَك وعداً طليقاً — و`verify` لا ترفع أصلاً، فـ`void` هنا وعدٌ لا يُهمَل بل لا يُخيب.
    server.use((socket, next) => void this.verify(socket, next));
  }

  private async verify(socket: Socket, next: (err?: Error) => void) {
    const token = (socket.handshake.auth as { token?: string })?.token ?? (socket.handshake.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    try { (socket.data as { user?: AuthUser }).user = await this.tokens.verifyAccess(token); next(); }
    catch { next(new Error('UNAUTHORIZED')); }
  }
  @SubscribeMessage('subscribe')
  async subscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { channel?: string }) {
    const user = (client.data as { user?: AuthUser }).user; const channel = body?.channel ?? '';
    const m = /^([a-z-]+):([0-9a-f-]{36})$/i.exec(channel);
    if (!user || !m) return { ok: false, code: 'FORBIDDEN', channel };
    // org:{id} — القناة التي تسمع عليها المنشأة ما يصلها الآن: طلب إصلاح قريب، طلب قطعة.
    // كل القنوات الأخرى مفتاحها كيانٌ يعرفه المزوّد سلفاً، فلا يسمع الجديد إلا إن سحب القائمة.
    // والحلقة التي يقوم عليها المنتج هي أن يسمع الورشةُ العطلَ لحظةَ حدوثه (توجيه المالك ٢٥ أغسطس).
    // العضوية محمولة في الرمز أصلاً، فالحارس هنا بلا نداء قاعدة.
    if (m[1] === 'org') {
      if (!(user.orgs.some((o) => o.orgId === m[2]) || isStaff(user))) return { ok: false, code: 'FORBIDDEN', channel };
    } else if (m[1] === 'work-order') {
      const wo = await this.repo.findById(m[2]!);
      if (!wo || !(isWorkshopMember(wo, user) || isCustomer(wo, user) || isStaff(user))) return { ok: false, code: 'FORBIDDEN', channel };
    } else {
      // Channels of other modules join through the checker that module registered (default deny).
      const checker = this.channelAccess.get(m[1]!);
      if (!checker || !(await checker(m[2]!, user).catch(() => false))) return { ok: false, code: 'FORBIDDEN', channel };
    }
    await client.join(channel); return { ok: true, channel };
  }
  @SubscribeMessage('unsubscribe')
  async unsubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { channel?: string }) { if (body?.channel) await client.leave(body.channel); return { ok: true }; }
  publish(channel: string, event: string, payload: unknown): void { this.server?.to(channel).emit(event, payload); }
  registerChannel(prefix: string, checker: ChannelAccessChecker): void { this.channelAccess.set(prefix, checker); }
}

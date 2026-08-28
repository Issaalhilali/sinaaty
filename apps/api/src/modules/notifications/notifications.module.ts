import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { AppConfig } from '../../config';
import { AccidentsModule } from '../accidents/accidents.module';
import { ServiceRequestsModule } from '../service-requests/service-requests.module';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { NOTIFICATION_REPOSITORY, type NotificationRepository } from './domain/repositories';
import { TEMPLATES } from './domain/templates';
import { PUSH_PORT, SMS_PORT, WHATSAPP_PORT, EMAIL_PORT } from './application/ports/channels.port';
import { NotificationService } from './application/notification.service';
import { NotificationOutboxHandlers } from './application/handlers/notification.handlers';
import { NotificationPrismaRepository } from './infrastructure/prisma/notification.prisma-repository';
import { PushMockAdapter, SmsMockAdapter, WhatsAppMockAdapter, EmailMockAdapter } from './infrastructure/channels/mock-channels';
import { FcmAdapter } from './infrastructure/channels/fcm.adapter';
import { AdminNotificationsController, NotificationsController } from './interface/http/notifications.controller';

const live = (name: string) => () => { throw new Error(`${name} live adapter not implemented — set INTEGRATION_SMS=mock`); };
@Module({
  imports: [IdentityModule, OrganizationsModule, WorkOrdersModule, AccidentsModule, ServiceRequestsModule],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [NotificationService, NotificationOutboxHandlers, PushMockAdapter, SmsMockAdapter, WhatsAppMockAdapter, EmailMockAdapter, { provide: NOTIFICATION_REPOSITORY, useClass: NotificationPrismaRepository },
    { provide: PUSH_PORT, inject: [AppConfig, PushMockAdapter], useFactory: (c: AppConfig, m: PushMockAdapter) => (c.get('INTEGRATION_PUSH') === 'live' ? new FcmAdapter(c) : m) },
    { provide: SMS_PORT, inject: [AppConfig, SmsMockAdapter], useFactory: (c: AppConfig, m: SmsMockAdapter) => (c.get('INTEGRATION_SMS') === 'mock' ? m : live('SMS')()) },
    // البريد: تجريبي حتى يُعقد مزوّد (docs/integrations/email.md) — live يرفض الإقلاع كي لا نتظاهر
    { provide: EMAIL_PORT, inject: [AppConfig, EmailMockAdapter], useFactory: (c: AppConfig, m: EmailMockAdapter) => (c.get('INTEGRATION_EMAIL') === 'mock' ? m : live('Email')()) },
    { provide: WHATSAPP_PORT, inject: [AppConfig, WhatsAppMockAdapter], useFactory: (c: AppConfig, m: WhatsAppMockAdapter) => (c.get('INTEGRATION_SMS') === 'mock' ? m : live('WhatsApp')()) }],
  exports: [NotificationService, PUSH_PORT, SMS_PORT],
})
export class NotificationsModule implements OnModuleInit {
  constructor(@Inject(NOTIFICATION_REPOSITORY) private readonly repo: NotificationRepository) {}
  /** Mirror code templates into notification_templates so ops can see/edit them (code stays the renderer). */
  async onModuleInit() { await this.repo.upsertTemplates(Object.values(TEMPLATES).map((t) => ({ code: t.code, channel: t.channels[0] ?? 'push', titleAr: t.titleAr, titleEn: t.titleEn, bodyAr: t.bodyAr, bodyEn: t.bodyEn }))); }
}

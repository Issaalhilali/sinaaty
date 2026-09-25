import { Injectable, Logger } from '@nestjs/common';
import type { EmailPort, PushMessage, PushPort, SmsPort, WhatsAppPort } from '../../application/ports/channels.port';
/** Dev/test channels: log + keep an in-memory outbox (inspectable in tests via `sent`). */
@Injectable()
export class PushMockAdapter implements PushPort {
  private readonly log = new Logger('mock-push'); readonly sent: PushMessage[] = [];
  send(m: PushMessage) { this.sent.push(m); this.log.log({ token: `${m.token.slice(0, 8)}…`, title: m.title }, '[mock push]'); return Promise.resolve({ ok: true, providerRef: `push_${this.sent.length}` }); }
}
@Injectable()
export class SmsMockAdapter implements SmsPort {
  private readonly log = new Logger('mock-sms'); readonly sent: Array<{ to: string; body: string }> = [];
  send(to: string, body: string) { this.sent.push({ to, body }); this.log.log({ to: `${to.slice(0, 7)}*****`, body: body.slice(0, 60) }, '[mock sms]'); return Promise.resolve({ ok: true, providerRef: `sms_${this.sent.length}` }); }
}
@Injectable()
export class WhatsAppMockAdapter implements WhatsAppPort {
  readonly sent: Array<{ to: string; templateId: string; params: string[] }> = [];
  sendTemplate(to: string, templateId: string, params: string[]) { this.sent.push({ to, templateId, params }); return Promise.resolve({ ok: true, providerRef: `wa_${this.sent.length}` }); }
}
@Injectable()
export class EmailMockAdapter implements EmailPort {
  private readonly log = new Logger('mock-email'); readonly sent: Array<{ to: string; subject: string; body: string }> = [];
  send(to: string, subject: string, body: string) { this.sent.push({ to, subject, body }); this.log.log({ to: to.replace(/(.{2}).*(@.*)/, '$1***$2'), subject }, '[mock email]'); return Promise.resolve({ ok: true, providerRef: `em_${this.sent.length}` }); }
}

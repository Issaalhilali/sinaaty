export interface PushMessage { token: string; title: string; body: string; data?: Record<string, string> }
export interface PushPort { send(m: PushMessage): Promise<{ ok: boolean; providerRef?: string; invalidToken?: boolean }> }
export interface SmsPort { send(to: string, body: string): Promise<{ ok: boolean; providerRef?: string }> }
/** الفواتير والإيصالات لمن ترك بريده — الموضوع والنص مُرمَّلان جاهزين، والمنفذ يرسل فقط. */
export interface EmailPort { send(to: string, subject: string, body: string): Promise<{ ok: boolean; providerRef?: string }> }
export const EMAIL_PORT = Symbol('EMAIL_PORT');
export interface WhatsAppPort { sendTemplate(to: string, templateId: string, params: string[]): Promise<{ ok: boolean; providerRef?: string }> }
export const PUSH_PORT = Symbol('PUSH_PORT'); export const SMS_PORT = Symbol('SMS_PORT'); export const WHATSAPP_PORT = Symbol('WHATSAPP_PORT');

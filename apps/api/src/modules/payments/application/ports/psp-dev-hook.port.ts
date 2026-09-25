/** Dev/test hook: build a signed webhook for a mock intent (no-op in live). */
export interface PspDevHookPort { makeWebhook(intentId: string, type?: 'payment.succeeded' | 'payment.failed'): { body: string; headers: Record<string, string> } }
export const PSP_DEV_HOOK_PORT = Symbol('PSP_DEV_HOOK_PORT');

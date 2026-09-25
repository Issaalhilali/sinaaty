/**
 * PII redaction for logs / persisted provider payloads (integration_requests.request_payload).
 * Masks by key name and by value shape (Saudi national id, IBAN, phone).
 */
const SENSITIVE_KEYS = /^(password|otp|code|token|access_token|refresh_token|authorization|secret|api_key|national_id|nationalid|iqama|iban|card|pan|cvv|phone|phone_e164|mobile|email|full_name|name_ar|name_en|dob|date_of_birth|address|national_address|private_key|csid)$/i;
const NATIONAL_ID = /\b[12]\d{9}\b/g; // Saudi ID/Iqama: 10 digits starting 1 or 2
const IBAN = /\bSA\d{2}[0-9A-Z]{20}\b/gi; // Saudi IBAN: SA + 2 check digits + 20 chars
const PHONE = /\+?9665\d{8}\b/g;

export const REDACTED = '[REDACTED]';

export function redactString(s: string): string {
  return s.replace(IBAN, 'SA**[IBAN]').replace(NATIONAL_ID, '**********').replace(PHONE, '+9665*******');
}

export function redactPii<T>(input: T, depth = 0): T {
  if (depth > 12) return REDACTED as unknown as T;
  if (input === null || input === undefined) return input;
  if (typeof input === 'string') return redactString(input) as unknown as T;
  if (Array.isArray(input)) return input.map((v: unknown) => redactPii(v, depth + 1)) as unknown as T;
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.test(k) ? REDACTED : redactPii(v, depth + 1);
    }
    return out as T;
  }
  return input;
}

/** Wire format for every error response (CLAUDE.md Step 1). */
export interface ErrorEnvelope {
  code: string;
  message_ar: string;
  message_en: string;
  details?: unknown;
  request_id?: string;
}

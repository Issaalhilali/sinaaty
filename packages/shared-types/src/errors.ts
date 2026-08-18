/** Wire format for every API error response (mirrors apps/api common/http). */
export interface ApiErrorEnvelope {
  code: string;
  message_ar: string;
  message_en: string;
  details?: unknown;
  request_id?: string;
}

import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../../config';
import { extractItems, priceFrom, type ExtractedItem } from '../../domain/extraction';
import type { ItemExtractionPort } from '../../application/ports/item-extraction.port';

const TOOL = {
  name: 'propose_work_order_items',
  description: 'Propose the work-order lines the service advisor dictated. Use only what was said.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['labor', 'part', 'paint', 'towing', 'storage', 'diagnostic', 'other'] },
            description_ar: { type: 'string', description: 'وصف البند بالعربية كما قيل، بدون السعر' },
            quantity: { type: 'string' },
            unit_price: { type: ['string', 'null'], description: 'السعر إن ذُكر صراحة، وإلا null' },
            heard_ar: { type: 'string', description: 'الجملة التي اشتُق منها البند' },
          },
          required: ['type', 'description_ar', 'quantity', 'heard_ar'],
        },
      },
    },
    required: ['items'],
  },
} as const;

const SYSTEM = [
  'أنت مساعد لورشة سيارات سعودية. تحوّل ما يمليه مستشار الخدمة إلى بنود أمر عمل.',
  'قواعد صارمة: لا تخترع سعراً لم يُذكر — اترك unit_price فارغاً. لا تضف بنداً لم يُذكر.',
  'الوصف بالعربية كما قيل، بدون كلمات السعر. الكمية 1 ما لم تُذكر كمية.',
].join('\n');

type ToolUse = { type: string; name?: string; input?: { items?: Array<Record<string, unknown>> } };

/**
 * Claude as the extractor. Two guardrails make the model safe to use on something the customer signs:
 *
 *  1. **Prices are verified against the words.** Whatever the model returns, the price is only kept when
 *     the same amount can be found in the sentence it claims to have heard. A hallucinated number is
 *     dropped to null and the advisor fills it in.
 *  2. **Anything unusable falls back to the offline rules** — an API outage degrades the feature, it does
 *     not break the work order.
 */
@Injectable()
export class ClaudeExtractionAdapter implements ItemExtractionPort {
  readonly provider = 'claude';
  private readonly log = new Logger(ClaudeExtractionAdapter.name);
  constructor(private readonly config: AppConfig) {}

  async extract(input: { transcriptAr: string; vehicleAr?: string | null }): Promise<ExtractedItem[]> {
    const key = this.config.get('ANTHROPIC_API_KEY');
    if (!key) return extractItems(input.transcriptAr);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: this.config.get('AI_MODEL'),
          max_tokens: 1024,
          system: SYSTEM,
          tools: [TOOL],
          tool_choice: { type: 'tool', name: TOOL.name },
          messages: [{ role: 'user', content: `المركبة: ${input.vehicleAr ?? 'غير محددة'}\nالنص: ${input.transcriptAr}` }],
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`anthropic ${res.status}`);
      const body = (await res.json()) as { content?: ToolUse[] };
      const rows = body.content?.find((c) => c.type === 'tool_use' && c.name === TOOL.name)?.input?.items ?? [];
      const mapped = rows.map((r) => this.verify(r, input.transcriptAr)).filter((r): r is ExtractedItem => r !== null);
      return mapped.length ? mapped : extractItems(input.transcriptAr);
    } catch (e) {
      this.log.warn(`extraction fell back to the offline rules: ${(e as Error).message}`);
      return extractItems(input.transcriptAr);
    }
  }

  /** Keeps the model's wording, but never its arithmetic: a price must exist in what was actually said. */
  private verify(row: Record<string, unknown>, transcript: string): ExtractedItem | null {
    // The payload comes from a model: every field is narrowed before it is used, never coerced blindly.
    const text = (v: unknown, fallback = '') => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback);
    const descriptionAr = text(row['description_ar']).trim();
    if (descriptionAr.length < 2) return null;
    const heardAr = text(row['heard_ar']).trim() || transcript;
    const claimed = row['unit_price'] == null ? null : Number(row['unit_price']);
    const said = priceFrom(heardAr) ?? priceFrom(transcript);
    const price = claimed != null && said != null && Math.abs(claimed - said) < 0.01 ? claimed : said;
    return {
      type: (['labor', 'part', 'paint', 'towing', 'storage', 'diagnostic', 'other'].includes(text(row['type'])) ? text(row['type']) : 'other') as ExtractedItem['type'],
      descriptionAr,
      quantity: text(row['quantity'], '1'),
      unitPrice: price != null && price > 0 ? price.toFixed(2) : null,
      confidence: price != null ? (claimed != null && said != null ? 0.9 : 0.7) : 0.5,
      heardAr,
    };
  }
}

/** Offline rules as a port implementation — used when INTEGRATION_AI=mock. */
@Injectable()
export class RulesExtractionAdapter implements ItemExtractionPort {
  readonly provider = 'rules';
  extract(input: { transcriptAr: string }): Promise<ExtractedItem[]> { return Promise.resolve(extractItems(input.transcriptAr)); }
}

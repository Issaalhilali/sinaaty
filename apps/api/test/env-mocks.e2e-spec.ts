import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// حارسٌ على الحارس: قائمة المزوّدين في إعداد الاختبارات تُقارَن بمخطّط البيئة، فمزوّدٌ يُضاف
// غداً ولا يُدرَج هنا يُسقط هذا الاختبار — بدل أن يُقلع بمزوّدٍ حيّ في اختبارٍ لا أحد يراقبه.
describe('لا اختبار يكلّم مزوّداً حقيقياً', () => {
  const flags = (src: string) => [...new Set(src.match(/INTEGRATION_[A-Z_]+/g) ?? [])].sort();

  it('كل مزوّد في المخطّط مضبوطٌ على mock قبل إقلاع أي حزمة', () => {
    const schema = flags(readFileSync(join(__dirname, '../src/config/env.schema.ts'), 'utf8'));
    expect(schema.length).toBeGreaterThan(0);
    for (const f of schema) expect([f, process.env[f]]).toEqual([f, 'mock']);
  });

  it('ولا يكفي أن تُضبط: البيئة يجب أن تعلو ملف .env وإلا كان الضبط بلا أثر', () => {
    // العطل الأصلي بعينه: `.env` كان يحمل INTEGRATION_PUSH=live فغلب المفروض في الاختبارات.
    const cfg = readFileSync(join(__dirname, '../src/config/config.module.ts'), 'utf8');
    expect(cfg).toMatch(/\.\.\.process\.env/);
  });
});

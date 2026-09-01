import { triage } from '../domain/triage';

/**
 * الجُمل هنا مكتوبةٌ كما يقولها الناس فعلاً — بلهجةٍ وبلا تشكيل وبأخطاء إملائية —
 * لأن المستخدم الذي بُني له هذا ليس متمكناً من التقنية، ولن يكتب «طلب صيانة دورية».
 */
describe('الفرز الذكي — يفهم كلام الناس', () => {
  it('«سيارتي ما تشتغل» ⟵ إصلاح عاجل، والعرض يُسمّي المشكلة', () => {
    const r = triage('سيارتي ما تشتغل من الصبح');
    expect(r.kind).toBe('repair');
    expect(r.symptoms).toContain('no_start');
    expect(r.urgent).toBe(true);
    expect(r.confidence).toBeGreaterThanOrEqual(.8);
  });

  it('«ابغى دينمو كامري ٢٠١٩» ⟵ قطعة، بالطراز والسنة كما نطقها', () => {
    const r = triage('ابغى دينمو كامري ٢٠١٩');
    expect(r.kind).toBe('part');
    expect(r.partNameAr).toContain('دينمو');
    expect(r.partNameAr).toContain('كامري');
    expect(r.partNameAr).toContain('2019');            // الأرقام العربية تُقرأ
    expect(r.confidence).toBeGreaterThanOrEqual(.9);
  });

  it('«ما تتحرك على الطريق» ⟵ سطحة لا إصلاح، ولو ذُكر عطلٌ معها', () => {
    const r = triage('السيارة ما تتحرك واقف على الطريق والمكينة تسخن');
    expect(r.kind).toBe('tow');
    expect(r.urgent).toBe(true);
  });

  it('عرضان معاً يرفعان الثقة — «صوت في الفرامل ورجّة»', () => {
    const r = triage('يطلع صوت من الفرامل وفيه رجه في الدركسون');
    expect(r.kind).toBe('repair');
    expect(r.symptoms).toEqual(expect.arrayContaining(['brakes', 'noise', 'shake']));
    expect(r.confidence).toBeGreaterThanOrEqual(.9);
  });

  it('كلامٌ غامض لا يُردّ صاحبه: إصلاحٌ بثقةٍ منخفضة — الورشة أدرى منّا', () => {
    const r = triage('فيها شي مو طبيعي');
    expect(r.kind).toBe('repair');
    expect(r.confidence).toBeLessThan(.8);
    expect(r.sayAr).toContain('ورشك');
  });

  it('العنوان من كلامه هو، مقصوصاً لا مخترعاً', () => {
    const long = 'السيارة تسحب على اليمين وفيه صوت من الاطار الامامي الايمن وكل ما زادت السرعة زاد الصوت وصار يهتز الدركسون';
    const r = triage(long);
    expect(long.startsWith(r.titleAr.replace('…', ''))).toBe(true);
    expect(r.titleAr.length).toBeLessThanOrEqual(62);
  });

  it('نصٌّ فارغ لا يكسر شيئاً', () => {
    expect(triage('').kind).toBe('repair');
    expect(triage('   ').confidence).toBeLessThan(.8);
  });
});

# رموز التصميم — مصدر واحد لكل سطح

| المجموعة | Flutter (`tokens.dart`) | Angular (`tailwind.config.js` / `preset.ts`) |
|---|---|---|
| ألوان الهوية | `SinaatyColors.seal/sealInk/sealDeep/sealSoft/brass/brassSoft` | `seal`, `seal-ink`, `seal-deep`, `seal-soft`, `brass`, `brass-soft` |
| الورق والحبر | `ground/paper/paper2/line/ink/ink2/muted` | `ground`, `white`, `paper-2`, `line`, `ink`, `ink-2`, `muted` |
| الحالة | `warn/warnSoft/bad/badSoft` | `warn`, `warn-soft`, `bad`, `bad-soft` |
| المسافات | `SinaatySpace.xs…xxl` (4·8·12·16·24·32) | Tailwind الافتراضي (1=4px) |
| الزوايا | `SinaatySpace.radius 12` (كان 14) · `radiusCard 14` · `radiusHero 20` (`radiusLg` اسم بديل) | `rounded-xl 12`, `rounded-xl2 14`, `rounded-xl3 20` |
| الظلّ | `SinaatyShadow.hero` فقط | `shadow-seal` فقط؛ `shadow-card` يُلغى |
| الطباعة | Almarai 400/700/800، المقياس في `AppTheme` | IBM Plex Sans Arabic 400/600/700 (اللوحة تبقى Plex: وجه مكتبي محايد) |
| الأهداف | `tapTarget 56`, `navBar 82` | `h-11` (44) للأزرار، `h-12` للحقول |

## قواعد الرمز
1. لا لون سداسي داخل ودجت أو قالب؛ يُستدعى الرمز.
2. الحالة الداكنة: رموز `d*` تبقى في `tokens.dart` تحت تعليق «dark» موثّقة المعايرة؛ لا شاشة تستوردها مباشرة (٠ استعمال في `lib/features`)، ولا لقطات داكنة جديدة.
3. أي رمز جديد يُضاف هنا وفي الكود في الالتزام نفسه، وله اختبار تباين إن كان لوناً.

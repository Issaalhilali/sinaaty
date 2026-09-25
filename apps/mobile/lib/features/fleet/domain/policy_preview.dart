/// ماذا تعني هذه القواعد عملياً — قبل أن تُحفظ.
///
/// **لماذا:** سياسة الصرف تُقرأ في كل مكان (شاشة الأسطول، لوحة الإدارة، سبب كل قرار) ولم تكن
/// تُضبط من أي مكان: كل أسطول يحتاج مهندساً يكتب أرقامه بنداء مباشر. وحين تُفتح للضبط، رقمٌ يُكتب
/// في حقلٍ فارغ قرارٌ أعمى — مسؤول الأسطول يجب أن يرى أثر رقمه على مبلغ حقيقي قبل الحفظ.
///
/// **مرآة لدالة الخادم** `decide` في `fleet/domain` — الترتيب نفسه بالضبط: المانع أولاً (ميزانية
/// الشهر) ثم الحدّان. أي تغيير هناك يُنسخ هنا؛ وهذه المعاينة **لا تقرّر** شيئاً، القرار يبقى للخادم
/// عند كل أمر عمل. (الورش المعتمدة ليست هنا لأن ضبطها يحتاج اختيار منشآت — في السجل.)
library;

enum PolicyOutcome { auto, oneApprover, twoApprovers, overBudget }

/// [total] مبلغ الأمر، و[monthToDateSpend] ما صُرف هذا الشهر. الحدود نصوصٌ كما تُكتب في الحقول،
/// والفارغ يعني «بلا حدّ».
PolicyOutcome previewDecision({
  required String total,
  String? autoApproveBelow,
  String? requiresTwoApproversAbove,
  String? monthlyBudget,
  String monthToDateSpend = '0',
}) {
  final t = double.tryParse(total) ?? 0;
  final budget = double.tryParse(monthlyBudget ?? '');
  if (budget != null && (double.tryParse(monthToDateSpend) ?? 0) + t > budget) return PolicyOutcome.overBudget;

  final two = double.tryParse(requiresTwoApproversAbove ?? '');
  if (two != null && t > two) return PolicyOutcome.twoApprovers;

  final auto = double.tryParse(autoApproveBelow ?? '') ?? 0;
  if (auto > 0 && t < auto) return PolicyOutcome.auto;

  return PolicyOutcome.oneApprover;
}

/// حدٌّ أعلى أصغر من حدّ الاعتماد التلقائي يجعل نطاق «معتمد واحد» مستحيلاً — خطأ ضبطٍ صامت
/// يظهر أثره بعد أسابيع على أوامر حقيقية، فيُقال وقت الكتابة.
bool thresholdsContradict({String? autoApproveBelow, String? requiresTwoApproversAbove}) {
  final auto = double.tryParse(autoApproveBelow ?? '');
  final two = double.tryParse(requiresTwoApproversAbove ?? '');
  return auto != null && two != null && two < auto;
}

import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/features/fleet/domain/policy_preview.dart';

/// المعاينة مرآة لدالة `decide` في الخادم — الترتيب نفسه: المانع أولاً ثم الحدّان. أي اختلاف هنا
/// يعني أن مسؤول الأسطول يضبط رقماً ويرى وعداً غير الذي سينفَّذ عليه.
void main() {
  test('بلا حدود ⟵ اعتماد واحد، وهي الحالة العادية', () {
    expect(previewDecision(total: '1500.00'), PolicyOutcome.oneApprover);
  });

  test('تحت حدّ الاعتماد التلقائي يمرّ — و«يساوي الحدّ» لا يمرّ (الخادم يقارن بأصغر تماماً)', () {
    expect(previewDecision(total: '350.00', autoApproveBelow: '500'), PolicyOutcome.auto);
    expect(previewDecision(total: '500.00', autoApproveBelow: '500'), PolicyOutcome.oneApprover);
  });

  test('فوق حدّ المعتمدَين يحتاج شخصين', () {
    expect(previewDecision(total: '6000.00', autoApproveBelow: '500', requiresTwoApproversAbove: '5000'), PolicyOutcome.twoApprovers);
    expect(previewDecision(total: '5000.00', autoApproveBelow: '500', requiresTwoApproversAbove: '5000'), PolicyOutcome.oneApprover);
  });

  test('الميزانية مانع يسبق الحدّين — لا معنى لسؤال شخصين عن مبلغ مرفوض أصلاً', () {
    expect(
      previewDecision(total: '6000.00', autoApproveBelow: '500', requiresTwoApproversAbove: '5000', monthlyBudget: '10000', monthToDateSpend: '9000'),
      PolicyOutcome.overBudget,
    );
    // ومبلغٌ صغير جداً يمرّ تلقائياً ما دام داخل الميزانية.
    expect(
      previewDecision(total: '300.00', autoApproveBelow: '500', monthlyBudget: '10000', monthToDateSpend: '1000'),
      PolicyOutcome.auto,
    );
  });

  test('حدّان متناقضان يُقالان وقت الكتابة لا بعد أسابيع على أوامر حقيقية', () {
    expect(thresholdsContradict(autoApproveBelow: '5000', requiresTwoApproversAbove: '1000'), isTrue);
    expect(thresholdsContradict(autoApproveBelow: '500', requiresTwoApproversAbove: '5000'), isFalse);
    expect(thresholdsContradict(autoApproveBelow: '500'), isFalse, reason: 'حدٌّ واحد لا يناقض شيئاً');
  });
}

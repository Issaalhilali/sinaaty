import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/features/parts/domain/parts.dart';
void main() {
  PartRequest req(String id, DateTime ends, String status) => PartRequest(
        id: id, number: id, partNameAr: 'قطعة', acceptedConditions: const [], quantity: 1,
        biddingEndsAt: ends, status: status, bids: const [], createdAt: DateTime(2026, 8, 1));
  test('the countdown grows its unit — nobody reads «1064 د»', () {
    expect(remainingIn(const Duration(minutes: 18)), (unit: RemainingUnit.minutes, value: 18));
    expect(remainingIn(const Duration(minutes: 1064)), (unit: RemainingUnit.hours, value: 17));
    expect(remainingIn(const Duration(days: 2, hours: 3)), (unit: RemainingUnit.days, value: 2));
    expect(remainingIn(const Duration(minutes: -5)), (unit: RemainingUnit.ended, value: 0));
  });
  test('the supplier inbox leads with what can still be won, and crops the graveyard', () {
    final now = DateTime.now();
    final all = [
      for (var i = 0; i < 12; i++) req('dead$i', now.subtract(Duration(days: i + 1)), 'expired'),
      req('soon', now.add(const Duration(minutes: 30)), 'open'),
      req('later', now.add(const Duration(hours: 9)), 'open'),
    ];
    final inbox = supplierInbox(all);
    expect(inbox.first.id, 'soon');            // الأقرب انتهاءً أولاً
    expect(inbox[1].id, 'later');
    expect(inbox.where((r) => !r.open).length, 5);   // ذيل المنتهي مقصوص
    expect(inbox.length, 7);
  });
}

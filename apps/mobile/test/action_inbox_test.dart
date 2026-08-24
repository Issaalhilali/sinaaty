import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/features/workshop/domain/action_inbox.dart';

/// الترتيب قاعدة عمل لا ذوق: المال المعرّض للخطر أولاً، ثم عميل ينتظر، ثم فرصة قد تفوت.
void main() {
  test('الأشد إلحاحاً أولاً: نزاع ثم سيارة منسيّة ثم اعتماد ثم فرصة', () {
    final items = buildInbox(
      orderStatuses: ['awaiting_approval', 'awaiting_approval', 'ready', 'in_progress', 'closed'],
      readyDaysWaiting: [12],
      openDisputes: 1,
      nearbyServiceRequests: 3,
      incomingPartRequests: 2,
      deliveredUninvoiced: 0,
    );
    expect(items.map((i) => i.kind).toList(), [
      InboxKind.dispute, InboxKind.abandonedRisk, InboxKind.awaitingApproval,
      InboxKind.readyToDeliver, InboxKind.serviceRequest, InboxKind.partBid,
    ]);
    expect(items.firstWhere((i) => i.kind == InboxKind.awaitingApproval).count, 2);
    expect(inboxTotal(items), 1 + 1 + 2 + 1 + 3 + 2);
    expect(inboxHasUrgent(items), isTrue);
  });

  test('سيارة جاهزة منذ يومين ليست في خطر — لا نُفزع بلا سبب', () {
    final items = buildInbox(orderStatuses: ['ready'], readyDaysWaiting: [2], openDisputes: 0,
        nearbyServiceRequests: 0, incomingPartRequests: 0, deliveredUninvoiced: 0);
    expect(items.any((i) => i.kind == InboxKind.abandonedRisk), isFalse);
    expect(inboxHasUrgent(items), isFalse);
  });

  test('لا شيء ينتظر ⇒ صندوق فارغ لا يُعرض', () {
    final items = buildInbox(orderStatuses: ['closed', 'cancelled', 'delivered'], readyDaysWaiting: const [],
        openDisputes: 0, nearbyServiceRequests: 0, incomingPartRequests: 0, deliveredUninvoiced: 0);
    expect(items, isEmpty);
    expect(inboxTotal(items), 0);
  });

  test('الحالات المنتهية لا تُعدّ انتظاراً', () {
    expect(isSettled('closed'), isTrue);
    expect(isSettled('delivered'), isTrue);
    expect(isSettled('in_progress'), isFalse);
  });

  test('سُلّمت ولم تُصدَر لها فاتورة: عملٌ تمّ بلا مطالبة بالمال', () {
    const orders = [(id: 'w1', status: 'delivered'), (id: 'w2', status: 'delivered'), (id: 'w3', status: 'in_progress')];
    expect(deliveredUninvoicedCount(orders, const {'w1'}), 1, reason: 'w2 وحدها بلا فاتورة');
    expect(deliveredUninvoicedCount(orders, const {'w1', 'w2'}), 0);
    expect(deliveredUninvoicedCount(orders, const {}), 2, reason: 'قيد التنفيذ لا يُحتسب — لم يُسلَّم بعد');
  });
}

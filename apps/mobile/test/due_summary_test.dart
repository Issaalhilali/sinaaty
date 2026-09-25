import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/features/billing/domain/due.dart';

typedef _Inv = ({String id, String? workOrderId, String remaining, bool payable});
typedef _Note = ({String? invoiceId, String? workOrderId, String outstanding, bool overdue, bool isOpen});

void main() {
  test('لا شيء مستحق ⟵ لا سطر (سطرٌ يقول ٠ تدريبٌ على تجاهله)', () {
    expect(dueSummary(invoices: const <_Inv>[], notes: const <_Note>[]), isNull);
    expect(
      dueSummary(invoices: const <_Inv>[(id: 'i1', workOrderId: null, remaining: '0.00', payable: false)], notes: const <_Note>[]),
      isNull,
    );
  });

  test('فاتورة بلا سند ⟵ متبقّيها', () {
    final d = dueSummary(invoices: const <_Inv>[(id: 'i1', workOrderId: null, remaining: '747.50', payable: true)], notes: const <_Note>[]);
    expect(d!.amount, '747.50');
    expect(d.count, 1);
    expect(d.overdue, isFalse);
  });

  test('الفاتورة الآجلة وسندها لا يُجمعان — وإلا رأى العميل ضعف ما عليه', () {
    final d = dueSummary(
      invoices: const <_Inv>[(id: 'i1', workOrderId: null, remaining: '1000.00', payable: true)],
      notes: const <_Note>[(invoiceId: 'i1', workOrderId: null, outstanding: '1000.00', overdue: false, isOpen: true)],
    );
    expect(d!.amount, '1000.00', reason: 'السند يُحتسب وتُستثنى فاتورته');
    expect(d.count, 1);
  });

  test('سند متأخر يرفع الحالة — هنا يبدأ طريق الإنذار والتنفيذ', () {
    final d = dueSummary(
      invoices: const <_Inv>[(id: 'i2', workOrderId: null, remaining: '300.00', payable: true)],
      notes: const <_Note>[(invoiceId: 'i1', workOrderId: null, outstanding: '1000.00', overdue: true, isOpen: true)],
    );
    expect(d!.overdue, isTrue);
    expect(d.amount, '1300.00');
    expect(d.count, 2);
  });

  test('السند المُقفل لا يُحتسب، ولا يُخفي فاتورته إن بقي عليها شيء', () {
    final d = dueSummary(
      invoices: const <_Inv>[(id: 'i1', workOrderId: null, remaining: '250.00', payable: true)],
      notes: const <_Note>[(invoiceId: 'i1', workOrderId: null, outstanding: '0.00', overdue: false, isOpen: false)],
    );
    expect(d!.amount, '250.00');
    expect(d.count, 1);
  });

  test('ما يخصّ أمراً جارياً لا يُكرَّر هنا — بطاقة الأمر فوقه تعرضه أصلاً', () {
    const inv = <_Inv>[(id: 'i1', workOrderId: 'w1', remaining: '1368.50', payable: true)];
    expect(dueSummary(invoices: inv, notes: const <_Note>[], activeWorkOrderIds: const {'w1'}), isNull);
    // وحين تُسلَّم السيارة ويخرج الأمر من الجارية، يصير ديناً بلا سياق فيظهر.
    expect(dueSummary(invoices: inv, notes: const <_Note>[])!.amount, '1368.50');
  });

  test('السند على أمر جارٍ يُستثنى كذلك — القاعدة واحدة للاثنين', () {
    final d = dueSummary(
      invoices: const <_Inv>[],
      notes: const <_Note>[(invoiceId: 'i1', workOrderId: 'w1', outstanding: '900.00', overdue: true, isOpen: true)],
      activeWorkOrderIds: const {'w1'},
    );
    expect(d, isNull);
  });
}

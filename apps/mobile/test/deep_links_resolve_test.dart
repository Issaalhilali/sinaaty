import 'dart:io';
import 'package:flutter_test/flutter_test.dart';

/// كل رابط عميق يرسله الخادم يجب أن يُصادف مساراً حقيقياً في الموجّه.
///
/// خمسة إشعارات سطحة كانت تقصد `sinaaty://transport/…` والموجّه يعرف `/tow/…` فقط: العميل
/// يُخبَر أن سيارته سُلّمت، فينقر، فلا يحدث شيء. ولا اختبار سقط — الرابط سليم الشكل والشاشة
/// موجودة، والوصلة بينهما وحدها مكسورة.
///
/// يقرأ هذا الاختبار **ملف قوالب الخادم نفسه** لا نسخةً منه: نسختان تفترقان بصمت، والمصدر
/// الواحد لا يفترق عن نفسه.
void main() {
  final templates = File('../api/src/modules/notifications/domain/templates.ts');
  final router = File('lib/core/routing/app_router.dart');

  test('كل رابط في قوالب الخادم يُصادف مساراً في الموجّه', () {
    expect(templates.existsSync(), isTrue, reason: 'ملف القوالب انتقل — حدّث المسار هنا');
    final links = RegExp(r"deepLink: '(sinaaty://[^']*)'")
        .allMatches(templates.readAsStringSync())
        .map((m) => m.group(1)!)
        .toSet();
    expect(links, isNotEmpty);

    final src = router.readAsStringSync();
    final paths = RegExp(r"path: '([^']*)'").allMatches(src).map((m) => m.group(1)!).toList();
    // المسارات المتداخلة تُكتب نسبيةً («approve» تحت «/work-orders/:id»)، فنبنيها كاملة.
    final full = <String>{};
    for (final p in paths) {
      if (p.startsWith('/')) { full.add(p); continue; }
      for (final parent in paths.where((x) => x.startsWith('/'))) full.add('$parent/$p');
    }

    // روابط `admin/` تخصّ لوحة التحكم على الويب: موظّف المنصة يعمل هناك لا في التطبيق،
    // وموجّهها ليس هذا الملف. تُستثنى صراحةً لا صمتاً.
    links.removeWhere((l) => l.startsWith('sinaaty://admin/'));
    final dead = <String>[];
    for (final link in links) {
      final u = Uri.parse(link);
      // الرابط يُترجم حرفياً في InboxScreen.routeFor: sinaaty://a/b → /a/b
      final segs = ['/${u.host}', ...u.pathSegments].join('/').replaceAll('//', '/');
      final matched = full.any((r) => _matches(r, segs));
      if (!matched) dead.add(link);
    }
    expect(dead, isEmpty, reason: 'روابط لا تفتح شيئاً عند النقر:\n  ${dead.join('\n  ')}');
  });
}

/// يطابق مسار الموجّه (بأجزائه المتغيّرة `:id`) رابطاً بأجزائه النائبة `{id}`.
bool _matches(String route, String link) {
  final r = route.split('/').where((s) => s.isNotEmpty).toList();
  final l = link.split('/').where((s) => s.isNotEmpty).toList();
  if (r.length != l.length) return false;
  for (var i = 0; i < r.length; i++) {
    final isParam = r[i].startsWith(':') && l[i].startsWith('{');
    if (!isParam && r[i] != l[i]) return false;
  }
  return true;
}

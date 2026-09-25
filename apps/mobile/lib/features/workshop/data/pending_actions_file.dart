import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import '../domain/workshop_repository.dart';
/// Durable JSON-file queue (small, append-rarely). Drift replaces this when we cache orders locally (docs/backlog.md).
class FilePendingActions implements PendingActions {
  final Future<Directory> Function() dir; FilePendingActions({Future<Directory> Function()? dir}) : dir = dir ?? getApplicationSupportDirectory;
  Future<File> _f() async => File('${(await dir()).path}/sinaaty_pending.json');
  @override Future<List<PendingAction>> all() async { final f = await _f(); if (!await f.exists()) return []; try { return (jsonDecode(await f.readAsString()) as List).cast<Map<String, dynamic>>().map(PendingAction.fromJson).toList(); } catch (_) { return []; } }
  Future<void> _write(List<PendingAction> l) async { final f = await _f(); await f.writeAsString(jsonEncode(l.map((a) => a.toJson()).toList()), flush: true); }
  @override Future<void> add(PendingAction a) async => _write([...await all(), a]);
  @override Future<void> remove(String id) async => _write((await all()).where((a) => a.id != id).toList());
}

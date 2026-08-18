import 'package:flutter_secure_storage/flutter_secure_storage.dart';
/// Access/refresh tokens live in the OS secure store (Keychain / EncryptedSharedPreferences). Never in prefs.
class TokenStore {
  static const _access = 'sinaaty.access'; static const _refresh = 'sinaaty.refresh';
  final FlutterSecureStorage _s;
  TokenStore([FlutterSecureStorage? s]) : _s = s ?? const FlutterSecureStorage(aOptions: AndroidOptions(encryptedSharedPreferences: true));
  Future<String?> access() => _s.read(key: _access);
  Future<String?> refresh() => _s.read(key: _refresh);
  Future<void> save({required String access, required String refresh}) async { await _s.write(key: _access, value: access); await _s.write(key: _refresh, value: refresh); }
  Future<void> clear() async { await _s.delete(key: _access); await _s.delete(key: _refresh); }
}
/// In-memory store for tests / web dev.
class MemoryTokenStore extends TokenStore {
  String? _a; String? _r; MemoryTokenStore() : super(const FlutterSecureStorage());
  @override Future<String?> access() async => _a; @override Future<String?> refresh() async => _r;
  @override Future<void> save({required String access, required String refresh}) async { _a = access; _r = refresh; }
  @override Future<void> clear() async { _a = null; _r = null; }
}

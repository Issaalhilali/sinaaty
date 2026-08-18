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

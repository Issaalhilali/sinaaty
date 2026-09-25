import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as sio;
import '../../../core/auth/token_store.dart';
import '../domain/service_market_repository.dart';
/// Socket.IO `/realtime` → subscribe `service-request:{id}` → tick on any event.
/// Falls back silently (the screen still refreshes on pull and resume).
class ServiceRequestRealtimeImpl implements ServiceRequestRealtime {
  final String baseUrl; final TokenStore tokens; ServiceRequestRealtimeImpl({required this.baseUrl, required this.tokens});
  @override Stream<void> changes(String requestId) {
    late StreamController<void> c; sio.Socket? socket;
    c = StreamController<void>(onListen: () async {
      final token = await tokens.access(); if (token == null) return;
      socket = sio.io('$baseUrl/realtime', sio.OptionBuilder().setTransports(['websocket']).setAuth({'token': token}).disableAutoConnect().build());
      socket!.onConnect((_) => socket!.emit('subscribe', {'channel': 'service-request:$requestId'}));
      socket!.onAny((_, _) { if (!c.isClosed) c.add(null); });
      socket!.connect();
    }, onCancel: () { socket?.dispose(); });
    return c.stream;
  }
}

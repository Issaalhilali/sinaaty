import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as sio;
import '../../../core/auth/token_store.dart';
import '../domain/work_orders_repository.dart';
/// Socket.IO `/realtime` → subscribe `work-order:{id}` → tick on any event. Falls back silently (screens also refresh on resume).
class WorkOrderRealtimeImpl implements WorkOrderRealtime {
  final String baseUrl; final TokenStore tokens; WorkOrderRealtimeImpl({required this.baseUrl, required this.tokens});
  @override Stream<void> changes(String workOrderId) {
    late StreamController<void> c; sio.Socket? socket;
    c = StreamController<void>(onListen: () async {
      final token = await tokens.access(); if (token == null) return;
      socket = sio.io('$baseUrl/realtime', sio.OptionBuilder().setTransports(['websocket']).setAuth({'token': token}).disableAutoConnect().build());
      socket!.onConnect((_) => socket!.emit('subscribe', {'channel': 'work-order:$workOrderId'}));
      socket!.onAny((_, _) { if (!c.isClosed) c.add(null); });
      socket!.connect();
    }, onCancel: () { socket?.dispose(); });
    return c.stream;
  }
}

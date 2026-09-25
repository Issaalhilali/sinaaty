import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as sio;
import '../../../core/auth/token_store.dart';
import '../domain/incoming.dart';
import '../domain/workshop_repository.dart';

/// Socket.IO `/realtime` → اشتراك `org:{id}` → كل طلب يصل المنشأة يخرج من هذا التيار.
///
/// يسقط بصمت عند تعذّر الاتصال: القائمة العادية تبقى تُحدَّث بالسحب وعند العودة للتطبيق. تنبيهٌ
/// فائت أخفّ من شاشة معطّلة.
class OrgChannelImpl implements OrgChannel {
  final String baseUrl;
  final TokenStore tokens;
  OrgChannelImpl({required this.baseUrl, required this.tokens});

  @override Stream<Incoming> incoming(String orgId) {
    late StreamController<Incoming> c;
    sio.Socket? socket;
    c = StreamController<Incoming>(
      onListen: () async {
        final token = await tokens.access();
        if (token == null) return;
        socket = sio.io('$baseUrl/realtime',
            sio.OptionBuilder().setTransports(['websocket']).setAuth({'token': token}).disableAutoConnect().build());
        socket!.onConnect((_) => socket!.emit('subscribe', {'channel': 'org:$orgId'}));
        // الحدثان وحدهما: ما عداهما على القناة ليس طلباً جديداً ولا يستحق أن يعلو شاشة أحد.
        for (final event in ['service-request', 'part-request']) {
          socket!.on(event, (data) {
            if (c.isClosed || data is! Map) return;
            final item = incomingFromEvent(event, Map<String, dynamic>.from(data));
            if (item != null) c.add(item);
          });
        }
        socket!.connect();
      },
      onCancel: () => socket?.dispose(),
    );
    return c.stream;
  }
}

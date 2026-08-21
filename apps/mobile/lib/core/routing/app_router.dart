import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/otp_screen.dart';
import '../../features/auth/presentation/providers.dart';
import '../../features/billing/presentation/invoice_screen.dart';
import '../../features/billing/presentation/note_screen.dart';
import '../../features/home/presentation/home_shell.dart';
import '../../features/notifications/presentation/inbox_screen.dart';
import '../../features/vehicles/presentation/add_vehicle_screen.dart';
import '../../features/vehicles/presentation/vehicle_screen.dart';
import '../../features/work_orders/presentation/approve_screen.dart';
import '../../features/work_orders/presentation/accident_report_screen.dart';
import '../../features/work_orders/presentation/inspection_diff_screen.dart';
import '../../features/work_orders/presentation/work_order_screen.dart';
import '../../features/workshop/presentation/inspection_screen.dart';
import '../../features/workshop/presentation/new_order_screen.dart';
import '../../features/workshop/presentation/order_screen.dart';
import '../../features/workshop/presentation/orders_screen.dart';
import '../../features/parts/presentation/part_order_screen.dart';
import '../../features/parts/presentation/request_screen.dart';
import '../../features/parts/presentation/warranties_screen.dart';
import '../../features/disputes/presentation/dispute_screen.dart';
import '../../features/transport/presentation/tow_job_screen.dart';
import '../../features/transport/presentation/tow_request_screen.dart';
import '../di/core_providers.dart';
/// go_router with an auth guard: unknown → splash, signedOut → /login, signedIn → /.
final routerProvider = Provider<GoRouter>((ref) {
  final notifier = _AuthListenable(ref);
  return GoRouter(
    initialLocation: '/', refreshListenable: notifier,
    redirect: (ctx, state) {
      final auth = ref.read(authControllerProvider); final loggingIn = state.matchedLocation.startsWith('/login');
      if (auth.status == AuthStatus.unknown) return state.matchedLocation == '/splash' ? null : '/splash';
      if (auth.status == AuthStatus.signedOut) return loggingIn ? null : '/login';
      if (loggingIn || state.matchedLocation == '/splash') return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const Scaffold(body: Center(child: CircularProgressIndicator()))),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen(), routes: [GoRoute(path: 'otp', builder: (_, s) { final e = (s.extra as Map?) ?? {}; return OtpScreen(phone: e['phone'] as String? ?? '', debugCode: e['debug'] as String?); })]),
      GoRoute(path: '/', builder: (_, _) => const HomeShell()),
      GoRoute(path: '/vehicles/add', builder: (_, _) => const AddVehicleScreen()),
      GoRoute(path: '/vehicles/:id', builder: (_, s) => VehicleScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/work-orders/:id', builder: (_, s) => WorkOrderScreen(id: s.pathParameters['id']!), routes: [GoRoute(path: 'approve', builder: (_, s) => ApproveScreen(id: s.pathParameters['id']!)), GoRoute(path: 'condition', builder: (_, s) => InspectionDiffScreen(id: s.pathParameters['id']!))]),
      GoRoute(path: '/invoices/:id', builder: (_, s) => InvoiceScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/notes/:id', builder: (_, s) => NoteScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/notifications', builder: (_, _) => const InboxScreen()),
      GoRoute(path: '/ws/new', builder: (_, _) => const NewOrderScreen()),
      GoRoute(path: '/warranties', builder: (_, _) => const WarrantiesScreen()),
      GoRoute(path: '/disputes/:id', builder: (_, s) => DisputeScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/tow/new', builder: (_, s) => TowRequestScreen(vehicleId: (s.extra as Map?)?['vehicle_id'] as String?, workOrderId: (s.extra as Map?)?['work_order_id'] as String?)),
      GoRoute(path: '/tow/:id', builder: (_, s) => TowJobScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/parts/requests/:id', builder: (_, s) => PartRequestScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/parts/orders/:id', builder: (_, s) => PartOrderScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/ws/orders', builder: (_, _) => const OrdersScreen(standalone: true)),
      GoRoute(path: '/ws/orders/:id', builder: (_, s) => WorkshopOrderScreen(id: s.pathParameters['id']!), routes: [GoRoute(path: 'inspect', builder: (_, s) => InspectionScreen(id: s.pathParameters['id']!)), GoRoute(path: 'accident', builder: (_, s) => AccidentReportScreen(workOrderId: s.pathParameters['id']!))]),
    ],
  );
});
class _AuthListenable extends ChangeNotifier { _AuthListenable(Ref ref) { ref.listen(authControllerProvider, (_, _) => notifyListeners()); ref.listen(sessionExpiredProvider, (_, _) { ref.read(authControllerProvider.notifier).signOut(); }); } }

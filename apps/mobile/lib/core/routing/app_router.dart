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
import '../../features/billing/presentation/wallet_screen.dart';
import '../../features/workshop/presentation/org_wallet_screen.dart';
import '../../features/workshop/presentation/inspection_screen.dart';
import '../../features/workshop/presentation/new_order_screen.dart';
import '../../features/workshop/presentation/order_screen.dart';
import '../../features/workshop/presentation/voice_invoice_screen.dart';
import '../../features/workshop/presentation/orders_screen.dart';
import '../../features/parts/presentation/part_order_screen.dart';
import '../../features/parts/presentation/request_screen.dart';
import '../../features/parts/presentation/warranties_screen.dart';
import '../../features/disputes/presentation/dispute_screen.dart';
import '../../features/fleet/presentation/fleet_statements_screen.dart';
import '../../features/service_market/presentation/nearby_requests_screen.dart';
import '../../features/service_market/presentation/service_request_screen.dart';
import '../../features/fleet/presentation/fleet_policy_screen.dart';
import '../../features/transport/presentation/driver_proof_screen.dart';
import '../../features/transport/presentation/tow_job_screen.dart';
import '../../features/transport/presentation/tow_request_screen.dart';
import '../di/core_providers.dart';
import '../../features/auth/presentation/welcome_screen.dart';
import '../config/app_config.dart';
/// go_router with an auth guard: unknown → splash, signedOut → /login, signedIn → /.
final routerProvider = Provider<GoRouter>((ref) {
  final notifier = _AuthListenable(ref);
  return GoRouter(
    initialLocation: '/', refreshListenable: notifier,
    redirect: (ctx, state) {
      final auth = ref.read(authControllerProvider); final loggingIn = state.matchedLocation.startsWith('/login');
      if (auth.status == AuthStatus.unknown) return state.matchedLocation == '/splash' ? null : '/splash';
      if (auth.status == AuthStatus.signedOut) {
        // أول فتحٍ على الإطلاق: الوعد قبل طلب الرقم — للعميل وحده، ومرةً واحدة في عمر الجهاز.
        // القراءة متزامنة (تُحمَّل في main قبل runApp عبر welcomeSeenProvider) فلا وميض شاشة.
        final isCustomer = ref.read(appConfigProvider).flavor == AppFlavor.customer;
        if (isCustomer && !ref.read(welcomeSeenProvider) && state.matchedLocation != '/welcome') return '/welcome';
        if (state.matchedLocation == '/welcome') return isCustomer && !ref.read(welcomeSeenProvider) ? null : '/login';
        return loggingIn ? null : '/login';
      }
      if (loggingIn || state.matchedLocation == '/splash' || state.matchedLocation == '/welcome') return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const Scaffold(body: Center(child: CircularProgressIndicator()))),
      GoRoute(path: '/welcome', builder: (_, _) => const WelcomeScreen()),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen(), routes: [GoRoute(path: 'otp', builder: (_, s) { final e = (s.extra as Map?) ?? {}; return OtpScreen(phone: e['phone'] as String? ?? '', debugCode: e['debug'] as String?); })]),
      GoRoute(path: '/', builder: (_, _) => const HomeShell()),
      GoRoute(path: '/vehicles/add', builder: (_, _) => const AddVehicleScreen()),
      GoRoute(path: '/vehicles/:id', builder: (_, s) => VehicleScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/work-orders/:id', builder: (_, s) => WorkOrderScreen(id: s.pathParameters['id']!), routes: [GoRoute(path: 'approve', builder: (_, s) => ApproveScreen(id: s.pathParameters['id']!)), GoRoute(path: 'condition', builder: (_, s) => InspectionDiffScreen(id: s.pathParameters['id']!))]),
      GoRoute(path: '/invoices/:id', builder: (_, s) => InvoiceScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/notes/:id', builder: (_, s) => NoteScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/notifications', builder: (_, _) => const InboxScreen()),
      GoRoute(path: '/ws/new', builder: (_, _) => const NewOrderScreen()),
      // المحفظة كانت تبويباً؛ صارت داخل «حسابي» بعد تقليص التبويبات إلى ثلاثة — فتحتاج عنواناً.
      GoRoute(path: '/wallet', builder: (_, _) => const WalletScreen()),
      GoRoute(path: '/warranties', builder: (_, _) => const WarrantiesScreen()),
      GoRoute(path: '/disputes/:id', builder: (_, s) => DisputeScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/service-requests/:id', builder: (_, s) => ServiceRequestScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/ws/service-requests', builder: (_, _) => const NearbyRequestsScreen()),
      GoRoute(path: '/ws/service-requests/:id', builder: (_, s) => ServiceRequestScreen(id: s.pathParameters['id']!, workshop: true)),
      GoRoute(path: '/fleet/statements', builder: (_, _) => const FleetStatementsScreen()),
      GoRoute(path: '/fleet/statements/:id', builder: (_, s) => FleetStatementScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/tow/new', builder: (_, s) => TowRequestScreen(vehicleId: (s.extra as Map?)?['vehicle_id'] as String?, workOrderId: (s.extra as Map?)?['work_order_id'] as String?)),
      GoRoute(path: '/tow/:id', builder: (_, s) => TowJobScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/fleet/policy', builder: (_, s) => FleetPolicyScreen(orgId: s.extra! as String)),
      GoRoute(path: '/drv/jobs/:id/proof', builder: (_, s) => DriverProofScreen(jobId: s.pathParameters['id']!)),
      GoRoute(path: '/parts/requests/:id', builder: (_, s) => PartRequestScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/parts/orders/:id', builder: (_, s) => PartOrderScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/ws/orders', builder: (_, _) => const OrdersScreen(standalone: true)),
      // إشعار «حُرّر المبلغ لك» كان يحمل مساراً لا وجود له، فالنقر لا يفعل شيئاً. المحفظة تبويبٌ
      // في الأصل، ولها الآن عنوانٌ يُفتح من الإشعار مباشرةً.
      GoRoute(path: '/ws/wallet', builder: (_, _) => const OrgWalletScreen()),
      // «تم اعتماد منشأتك 🎉» تفتح يوم المنشأة. الجذر وحده لا يصلح وجهةً لرابط: `routeFor` يترجم
      // المضيف مساراً، فـ«sinaaty://» بلا مضيفٍ لا يُترجم إلى شيء.
      GoRoute(path: '/today', redirect: (_, _) => '/'),
      GoRoute(path: '/ws/orders/:id', builder: (_, s) => WorkshopOrderScreen(id: s.pathParameters['id']!), routes: [GoRoute(path: 'inspect', builder: (_, s) => InspectionScreen(id: s.pathParameters['id']!)), GoRoute(path: 'accident', builder: (_, s) => AccidentReportScreen(workOrderId: s.pathParameters['id']!)), GoRoute(path: 'voice', builder: (_, s) => VoiceInvoiceScreen(workOrderId: s.pathParameters['id']!))]),
    ],
  );
});
class _AuthListenable extends ChangeNotifier { _AuthListenable(Ref ref) { ref.listen(authControllerProvider, (_, _) => notifyListeners()); ref.listen(sessionExpiredProvider, (_, _) { ref.read(authControllerProvider.notifier).signOut(); }); } }

import '../../../core/result/result.dart';
import 'vehicle.dart';
abstract interface class VehiclesRepository {
  /// [orgId]: مركبات منشأة أسطول لا مركبات المستخدم نفسه — مدير الأسطول لا يملك سياراته شخصياً.
  Future<Result<List<Vehicle>>> list({String? orgId});
  Future<Result<Vehicle>> add({String? vin, String? plate, String? ownerOrgId});
  Future<Result<VehiclePassport>> passport(String id);
  Future<Result<String>> shareLink(String id);
}

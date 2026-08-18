import '../../../core/result/result.dart';
import 'vehicle.dart';
abstract interface class VehiclesRepository {
  Future<Result<List<Vehicle>>> list();
  Future<Result<Vehicle>> add({String? vin, String? plate});
  Future<Result<VehiclePassport>> passport(String id);
  Future<Result<String>> shareLink(String id);
}

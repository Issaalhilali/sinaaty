import '../../../core/api/api_client.dart';
import '../../../core/api/api_error_mapper.dart';
import '../../../core/result/result.dart';
import '../domain/vehicle.dart';
import '../domain/vehicles_repository.dart';
Vehicle vehicleFromJson(Map<String, dynamic> j) => Vehicle(id: j['id'] as String, vin: j['vin'] as String?, plate: j['plateNumber'] as String?, makeAr: j['makeNameAr'] as String?, modelAr: j['modelNameAr'] as String?, year: (j['modelYear'] as num?)?.toInt(), colorAr: j['colorAr'] as String?, odometerKm: (j['odometerKm'] as num?)?.toInt());
class VehiclesRepositoryImpl implements VehiclesRepository {
  final ApiClient api; VehiclesRepositoryImpl(this.api);
  @override Future<Result<List<Vehicle>>> list() async { try { final r = await api.dio.get<List<dynamic>>('/vehicles'); return Result.ok(r.data!.map((e) => vehicleFromJson(e as Map<String, dynamic>)).toList()); } catch (e) { return Result.err(mapDioError(e)); } }
  @override Future<Result<Vehicle>> add({String? vin, String? plate}) async { try { final r = await api.dio.post<Map<String, dynamic>>('/vehicles', data: {if (vin != null && vin.isNotEmpty) 'vin': vin, if (plate != null && plate.isNotEmpty) 'plate': plate}); return Result.ok(vehicleFromJson(r.data!)); } catch (e) { return Result.err(mapDioError(e)); } }
  @override Future<Result<VehiclePassport>> passport(String id) async {
    try { final r = await api.dio.get<Map<String, dynamic>>('/vehicles/$id/passport'); final d = r.data!; return Result.ok(VehiclePassport(vehicleFromJson(d['vehicle'] as Map<String, dynamic>), ((d['events'] as List?) ?? []).map((e) { final m = e as Map<String, dynamic>; return VehicleEvent(id: m['id'] as String, type: m['type'] as String, occurredAt: DateTime.parse(m['occurredAt'] as String), summaryAr: m['summaryAr'] as String, summaryEn: m['summaryEn'] as String?, orgNameAr: m['orgNameAr'] as String?, odometerKm: (m['odometerKm'] as num?)?.toInt()); }).toList())); } catch (e) { return Result.err(mapDioError(e)); }
  }
  @override Future<Result<String>> shareLink(String id) async { try { final r = await api.dio.post<Map<String, dynamic>>('/vehicles/$id/passport/share'); return Result.ok('${api.dio.options.baseUrl.replaceFirst(RegExp(r'/v1$'), '')}${r.data!['path']}'); } catch (e) { return Result.err(mapDioError(e)); } }
}

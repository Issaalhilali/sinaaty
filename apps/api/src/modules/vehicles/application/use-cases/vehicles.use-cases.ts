import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { AppError } from '../../../../common/errors';
import { AuditLogWriter } from '../../../../common/audit';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { isPlatformStaff } from '../../../identity/domain/auth-user';
import { isOwner, toPublicPassport } from '../../domain/vehicle';
import { modelYearFromVin, normalizePlate, normalizeVin, PLATE_LETTERS_AR } from '../../domain/vin';
import { VEHICLE_EVENT_REPOSITORY, type VehicleEventRepository, VEHICLE_REPOSITORY, type VehicleRepository } from '../../domain/repositories';
import { VIN_DECODER_PORT, type VinDecoderPort } from '../ports/vin-decoder.port';
import { VehicleEventsWriter } from '../vehicle-events.writer';
import type { AddVehicleDto, OdometerDto } from '../dto/vehicles.dto';

@Injectable()
export class VehiclesUseCases {
  constructor(
    @Inject(VEHICLE_REPOSITORY) private readonly vehicles: VehicleRepository,
    @Inject(VEHICLE_EVENT_REPOSITORY) private readonly events: VehicleEventRepository,
    @Inject(VIN_DECODER_PORT) private readonly decoder: VinDecoderPort,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly passport: VehicleEventsWriter,
    private readonly audit: AuditLogWriter,
  ) {}

  async decodeVin(raw: string) {
    const vin = normalizeVin(raw); if (!vin) throw new AppError('VALIDATION', { details: [{ path: 'vin', message: 'VIN must be 17 characters (no I, O, Q)' }] });
    return this.decoder.decode(vin);
  }

  async add(user: AuthUser, dto: AddVehicleDto) {
    const vin = dto.vin ? normalizeVin(dto.vin) : null;
    if (dto.vin && !vin) throw new AppError('VALIDATION', {
      messageAr: 'رقم الهيكل ١٧ خانة من أرقام وحروف إنجليزية، بلا I أو O أو Q. راجعه من الاستمارة أو من لوحة الهيكل.',
      messageEn: 'The VIN is 17 characters, letters and digits, without I, O or Q.',
      details: [{ path: 'vin', message: 'invalid VIN' }],
    });
    const plate = dto.plate ? normalizePlate(dto.plate) : null;
    // الرسالة تُقرأ من صاحب السيارة لا من مبرمج: تقول الشكل المقبول والحروف المسموحة بالعربية.
    if (dto.plate && !plate) throw new AppError('VALIDATION', {
      messageAr: `اكتب اللوحة بثلاثة أحرف وأرقامها، بأي ترتيب: «أ ب ج ١٢٣٤» أو «١٢٣٤ أ ب ج». الحروف المعتمدة: ${PLATE_LETTERS_AR}`,
      messageEn: 'Plate is 3 letters and 1–4 digits, in either order (e.g. أ ب ج 1234 or 1234 أ ب ج).',
      details: [{ path: 'plate', message: 'invalid plate' }],
    });
    if (dto.owner_org_id && !user.orgs.some((o) => o.orgId === dto.owner_org_id) && !isPlatformStaff(user)) throw new AppError('FORBIDDEN');
    // اللوحة كذلك: من أضاف سيارته ولم يرها على الشاشة يُضيفها مرة أخرى — فتصير سيارتين لسيارة واحدة.
    if (!vin && plate) {
      const same = await this.vehicles.findByPlateForOwner(plate.ar, { userId: dto.owner_org_id ? undefined : user.id, orgId: dto.owner_org_id });
      if (same) return { ...same, already_exists: true };
    }
    if (vin) { const existing = await this.vehicles.findByVin(vin); if (existing) { if (isOwner(existing, user)) return { ...existing, already_exists: true }; throw new AppError('CONFLICT', { messageAr: 'هذه المركبة مسجّلة باسم مالك آخر.', messageEn: 'This vehicle is registered to another owner.' }); } }
    let makeId = dto.make_id, modelId = dto.model_id, modelYear = dto.model_year, engine: string | undefined, fuelType = dto.fuel_type, trim: string | undefined, decoded: unknown;
    if (vin) {
      const d = await this.decoder.decode(vin); decoded = d;
      if (!makeId && d.makeEn) { const mm = await this.vehicles.ensureMakeModel(d.makeEn, d.makeAr ?? undefined, d.modelEn ?? undefined); makeId = mm.makeId; modelId = modelId ?? mm.modelId ?? undefined; }
      modelYear = modelYear ?? d.modelYear ?? modelYearFromVin(vin) ?? undefined; engine = d.engine ?? undefined; fuelType = fuelType ?? d.fuelType ?? undefined; trim = d.trim ?? undefined;
    }
    const v = await this.vehicles.create({ vin: vin ?? undefined, plateAr: plate?.ar, plateEn: plate?.en, makeId, modelId, modelYear, trim, engine, fuelType, colorAr: dto.color_ar, odometerKm: dto.odometer_km, ownerType: dto.owner_org_id ? 'organization' : 'user', ownerUserId: dto.owner_org_id ? undefined : user.id, ownerOrgId: dto.owner_org_id, fleetAssetCode: dto.fleet_asset_code, vinDecoded: decoded });
    await this.uow.run(async (tx) => {
      await this.audit.write(tx, { action: 'vehicle.add', entityType: 'vehicle', entityId: v.id, actorUserId: user.id, orgId: dto.owner_org_id ?? null, after: { vin: v.vin, plate: v.plateNumber } });
      if (dto.odometer_km != null) await this.passport.record({ vehicleId: v.id, type: 'odometer', odometerKm: dto.odometer_km, summaryAr: `تسجيل العداد: ${dto.odometer_km.toLocaleString('en-US')} كم`, summaryEn: `Odometer recorded: ${dto.odometer_km} km`, isPublic: true }, tx);
    });
    return v;
  }
  listMine(user: AuthUser, orgId?: string) {
    if (orgId) { if (!user.orgs.some((o) => o.orgId === orgId) && !isPlatformStaff(user)) throw new AppError('FORBIDDEN'); return this.vehicles.listByOwner({ orgId }); }
    return this.vehicles.listByOwner({ userId: user.id });
  }
  async get(user: AuthUser, id: string) { const v = await this.mustOwn(user, id); return { ...v, events: await this.events.list(id, { limit: 50 }) }; }
  async setOdometer(user: AuthUser, id: string, dto: OdometerDto) {
    const v = await this.mustOwn(user, id);
    if (v.odometerKm != null && dto.odometer_km < v.odometerKm) throw new AppError('VALIDATION', { messageAr: 'قراءة العداد أقل من آخر قراءة مسجّلة.', messageEn: 'Odometer is lower than the last recorded reading.' });
    await this.uow.run((tx) => this.passport.record({ vehicleId: id, type: 'odometer', odometerKm: dto.odometer_km, summaryAr: `تحديث العداد: ${dto.odometer_km.toLocaleString('en-US')} كم`, summaryEn: `Odometer updated: ${dto.odometer_km} km` }, tx));
    return { odometer_km: dto.odometer_km };
  }
  async passportFor(user: AuthUser, id: string) { const v = await this.mustOwn(user, id); return { vehicle: v, events: await this.events.list(id) }; }
  async createShareLink(user: AuthUser, id: string) {
    await this.mustOwn(user, id);
    const token = randomBytes(24).toString('base64url');
    await this.vehicles.setPassportToken(id, token);
    return { token, path: `/v1/passport/${token}` };
  }
  async revokeShareLink(user: AuthUser, id: string) { await this.mustOwn(user, id); await this.vehicles.setPassportToken(id, null); return { revoked: true }; }
  async publicPassport(token: string) {
    const v = await this.vehicles.findByPassportToken(token); if (!v) throw new AppError('NOT_FOUND');
    return toPublicPassport(v, await this.events.list(v.id, { publicOnly: true }));
  }
  private async mustOwn(user: AuthUser, id: string) {
    const v = await this.vehicles.findById(id); if (!v) throw new AppError('NOT_FOUND');
    if (!isOwner(v, user) && !isPlatformStaff(user)) throw new AppError('FORBIDDEN');
    return v;
  }
}

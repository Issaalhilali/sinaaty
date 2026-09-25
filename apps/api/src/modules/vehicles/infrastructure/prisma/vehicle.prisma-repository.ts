import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { asTx, PrismaService } from '../../../../prisma';
import type { TxHandle } from '../../../../common/ports/unit-of-work.port';
import type { Vehicle } from '../../domain/vehicle';
import type { VehicleRepository } from '../../domain/repositories';

const select = { id: true, vin: true, plateNumber: true, plateNumberEn: true, makeId: true, modelId: true, modelYear: true, trim: true, engine: true, fuelType: true, colorAr: true, odometerKm: true, ownerType: true, ownerUserId: true, ownerOrgId: true, fleetAssetCode: true, ownershipVerifiedAt: true, passportPublicToken: true, createdAt: true, make: { select: { nameAr: true, nameEn: true } }, model: { select: { nameAr: true, nameEn: true } } } satisfies Prisma.VehicleSelect;
type Row = Prisma.VehicleGetPayload<{ select: typeof select }>;
const toVehicle = (r: Row): Vehicle => ({ id: r.id, vin: r.vin, plateNumber: r.plateNumber, plateNumberEn: r.plateNumberEn, makeId: r.makeId, modelId: r.modelId, makeNameAr: r.make?.nameAr ?? null, makeNameEn: r.make?.nameEn ?? null, modelNameAr: r.model?.nameAr ?? null, modelNameEn: r.model?.nameEn ?? null, modelYear: r.modelYear, trim: r.trim, engine: r.engine, fuelType: r.fuelType, colorAr: r.colorAr, odometerKm: r.odometerKm, ownerType: r.ownerType, ownerUserId: r.ownerUserId, ownerOrgId: r.ownerOrgId, fleetAssetCode: r.fleetAssetCode, ownershipVerifiedAt: r.ownershipVerifiedAt, passportPublicToken: r.passportPublicToken, createdAt: r.createdAt });

@Injectable()
export class VehiclePrismaRepository implements VehicleRepository {
  constructor(private readonly prisma: PrismaService) {}
  async create(i: Parameters<VehicleRepository['create']>[0]) {
    const r = await this.prisma.vehicle.create({ data: { vin: i.vin, plateNumber: i.plateAr, plateNumberEn: i.plateEn, makeId: i.makeId, modelId: i.modelId, modelYear: i.modelYear, trim: i.trim, engine: i.engine, fuelType: i.fuelType, colorAr: i.colorAr, odometerKm: i.odometerKm, ownerType: i.ownerType, ownerUserId: i.ownerUserId, ownerOrgId: i.ownerOrgId, fleetAssetCode: i.fleetAssetCode, vinDecoded: i.vinDecoded === undefined ? undefined : (i.vinDecoded as Prisma.InputJsonValue) }, select });
    return toVehicle(r);
  }
  async findById(id: string) { const r = await this.prisma.vehicle.findFirst({ where: { id, deletedAt: null }, select }); return r ? toVehicle(r) : null; }
  async findByVin(vin: string) { const r = await this.prisma.vehicle.findFirst({ where: { vin, deletedAt: null }, select }); return r ? toVehicle(r) : null; }
  async findByPlateForOwner(plateAr: string, owner: { userId?: string; orgId?: string }) {
    if (!owner.userId && !owner.orgId) return null;
    const r = await this.prisma.vehicle.findFirst({ where: { plateNumber: plateAr, deletedAt: null, ...(owner.orgId ? { ownerOrgId: owner.orgId } : { ownerUserId: owner.userId }) }, select });
    return r ? toVehicle(r) : null;
  }
  async vitalsByVehicles(vehicleIds: string[]) {
    const out = new Map<string, { lastServiceAt: Date | null; lastServiceTitleAr: string | null; activeWarranties: number; openWorkOrderId: string | null }>();
    if (!vehicleIds.length) return out;
    const now = new Date();
    const [last, wars, open] = await Promise.all([
      // آخر أمرٍ سُلّم فعلاً — لا مسودة ولا ملغى: «آخر صيانة» ادّعاءٌ لا يصح إلا بما اكتمل
      this.prisma.workOrder.findMany({ where: { vehicleId: { in: vehicleIds }, status: { in: ['delivered', 'closed'] } }, orderBy: { updatedAt: 'desc' }, select: { vehicleId: true, updatedAt: true, titleAr: true } }),
      this.prisma.warranty.groupBy({ by: ['vehicleId'], where: { vehicleId: { in: vehicleIds }, status: 'active', endsAt: { gt: now } }, _count: true }),
      this.prisma.workOrder.findMany({ where: { vehicleId: { in: vehicleIds }, status: { notIn: ['delivered', 'closed', 'cancelled', 'draft'] } }, orderBy: { createdAt: 'desc' }, select: { vehicleId: true, id: true } }),
    ]);
    for (const id of vehicleIds) out.set(id, { lastServiceAt: null, lastServiceTitleAr: null, activeWarranties: 0, openWorkOrderId: null });
    for (const r of last) { const e = out.get(r.vehicleId)!; if (!e.lastServiceAt) { e.lastServiceAt = r.updatedAt; e.lastServiceTitleAr = r.titleAr; } }
    for (const w of wars) if (w.vehicleId) out.get(w.vehicleId)!.activeWarranties = w._count;
    for (const o2 of open) { const e = out.get(o2.vehicleId)!; if (!e.openWorkOrderId) e.openWorkOrderId = o2.id; }
    return out;
  }
  async listByOwner(o: { userId?: string; orgId?: string }) { const rows = await this.prisma.vehicle.findMany({ where: { deletedAt: null, ...(o.orgId ? { ownerOrgId: o.orgId } : { ownerUserId: o.userId }) }, orderBy: { createdAt: 'desc' }, select }); return rows.map(toVehicle); }
  async updateOdometer(id: string, km: number, tx?: TxHandle) { const db = tx ? asTx(tx) : this.prisma; await db.vehicle.update({ where: { id }, data: { odometerKm: km } }); }
  async setPassportToken(id: string, token: string | null) { await this.prisma.vehicle.update({ where: { id }, data: { passportPublicToken: token } }); }
  async findByPassportToken(token: string) { const r = await this.prisma.vehicle.findFirst({ where: { passportPublicToken: token, deletedAt: null }, select }); return r ? toVehicle(r) : null; }
  async ensureMakeModel(makeEn: string, makeAr: string | undefined, modelEn?: string) {
    const make = await this.prisma.vehicleMake.upsert({ where: { nameEn: makeEn }, update: {}, create: { nameEn: makeEn, nameAr: makeAr ?? makeEn } });
    if (!modelEn) return { makeId: make.id, modelId: null };
    const model = await this.prisma.vehicleModel.upsert({ where: { makeId_nameEn: { makeId: make.id, nameEn: modelEn } }, update: {}, create: { makeId: make.id, nameEn: modelEn, nameAr: modelEn } });
    return { makeId: make.id, modelId: model.id };
  }
}

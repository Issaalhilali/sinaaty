import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { InspectionType } from '@sinaaty/shared-types';
import { asTx, PrismaService } from '../../../../prisma';
import type { TxHandle } from '../../../../common/ports/unit-of-work.port';
import type { InspectionRepository, InspectionRow } from '../../domain/repositories';

@Injectable()
export class InspectionPrismaRepository implements InspectionRepository {
  constructor(private readonly prisma: PrismaService) {}
  private db(tx?: TxHandle) { return tx ? asTx(tx) : this.prisma; }

  private async withMedia(rows: Array<{ id: string; work_order_id: string | null; vehicle_id: string; org_id: string | null; type: string; damages: unknown; performed_at: Date }>): Promise<InspectionRow[]> {
    if (!rows.length) return [];
    const links = await this.prisma.mediaLink.findMany({ where: { entityType: 'inspection', entityId: { in: rows.map((r) => r.id) } } });
    return rows.map((r) => ({
      id: r.id, workOrderId: r.work_order_id, vehicleId: r.vehicle_id, orgId: r.org_id,
      type: r.type as InspectionType, damages: r.damages, performedAt: r.performed_at,
      mediaIds: links.filter((l) => l.entityId === r.id).map((l) => l.mediaId),
    }));
  }

  async findById(id: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; work_order_id: string | null; vehicle_id: string; org_id: string | null; type: string; damages: unknown; performed_at: Date }>>`
      SELECT id, work_order_id, vehicle_id, org_id, type::text AS type, damages, performed_at FROM inspections WHERE id = ${id}::uuid`;
    return (await this.withMedia(rows))[0] ?? null;
  }

  async listByWorkOrder(workOrderId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; work_order_id: string | null; vehicle_id: string; org_id: string | null; type: string; damages: unknown; performed_at: Date }>>`
      SELECT id, work_order_id, vehicle_id, org_id, type::text AS type, damages, performed_at
      FROM inspections WHERE work_order_id = ${workOrderId}::uuid ORDER BY performed_at DESC`;
    return this.withMedia(rows);
  }

  async photosOf(inspectionId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ media_id: string; bucket: string; object_key: string; mime_type: string }>>`
      SELECT l.media_id, m.bucket, m.object_key, m.mime_type
      FROM media_links l JOIN media_assets m ON m.id = l.media_id
      WHERE l.entity_type = 'inspection' AND l.entity_id = ${inspectionId}::uuid AND m.mime_type LIKE 'image/%'`;
    return rows.map((r) => ({ mediaId: r.media_id, bucket: r.bucket, objectKey: r.object_key, mimeType: r.mime_type }));
  }

  async setDamages(id: string, damages: unknown, aiSummary: unknown, tx?: TxHandle) {
    await this.db(tx).inspection.update({
      where: { id },
      data: { damages: damages as Prisma.InputJsonValue, ...(aiSummary ? { aiSummary: aiSummary } : {}) },
    });
  }
}

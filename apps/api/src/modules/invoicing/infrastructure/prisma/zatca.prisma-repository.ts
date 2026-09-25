import { Injectable } from '@nestjs/common';
import { asTx, PrismaService } from '../../../../prisma';
import type { TxHandle } from '../../../../common/ports/unit-of-work.port';
import { GENESIS_PIH } from '@sinaaty/zatca-ubl';
import type { ZatcaDevice, ZatcaSubmission } from '../../domain/zatca';
import type { ZatcaRepository } from '../../domain/repositories';

type DeviceRow = { id: string; org_id: string; unit_name: string; is_production: boolean; last_icv: bigint; last_hash: string | null; csid_enc: Buffer | null; csid_expires_at: Date | null; created_at: Date };
const toDevice = (r: DeviceRow) => ({ id: r.id, orgId: r.org_id, unitName: r.unit_name, isProduction: r.is_production, lastIcv: r.last_icv.toString(), lastHash: r.last_hash, csidExpiresAt: r.csid_expires_at, createdAt: r.created_at, csidEnc: r.csid_enc });

@Injectable()
export class ZatcaPrismaRepository implements ZatcaRepository {
  constructor(private readonly prisma: PrismaService) {}
  private db(tx?: TxHandle) { return tx ? asTx(tx) : this.prisma; }
  async createDevice(d: Parameters<ZatcaRepository['createDevice']>[0], tx?: TxHandle) { const r = await this.db(tx).zatcaDevice.create({ data: { orgId: d.orgId, unitName: d.unitName, csidEnc: new Uint8Array(d.csidEnc), isProduction: d.isProduction, csidExpiresAt: d.csidExpiresAt ?? undefined }, select: { id: true } }); return r; }
  async updateDevice(id: string, p: Parameters<ZatcaRepository['updateDevice']>[1], tx?: TxHandle) { await this.db(tx).zatcaDevice.update({ where: { id }, data: { csidEnc: p.csidEnc ? new Uint8Array(p.csidEnc) : undefined, isProduction: p.isProduction, csidExpiresAt: p.csidExpiresAt ?? undefined } }); }
  async findDevice(id: string, tx?: TxHandle) { const rows = await this.db(tx).$queryRaw<DeviceRow[]>`SELECT * FROM zatca_devices WHERE id = ${id}::uuid`; return rows[0] ? toDevice(rows[0]) : null; }
  async findActiveDevice(orgId: string, tx?: TxHandle) { const rows = await this.db(tx).$queryRaw<DeviceRow[]>`SELECT * FROM zatca_devices WHERE org_id = ${orgId}::uuid ORDER BY is_production DESC, created_at DESC LIMIT 1`; return rows[0] ? toDevice(rows[0]) : null; }
  async listDevices(orgId: string): Promise<ZatcaDevice[]> { const rows = await this.prisma.$queryRaw<DeviceRow[]>`SELECT * FROM zatca_devices WHERE org_id = ${orgId}::uuid ORDER BY created_at DESC`; return rows.map((r) => { const { csidEnc: _drop, ...rest } = toDevice(r); return rest; }); }
  /**
   * Reserves the next ICV under a row lock: two invoices issued at the same instant get different
   * counters and a correct previous hash, which is what makes the chain provable.
   */
  async advanceChain(deviceId: string, tx: TxHandle) {
    const rows = await asTx(tx).$queryRaw<Array<{ last_icv: bigint; last_hash: string | null }>>`SELECT last_icv, last_hash FROM zatca_devices WHERE id = ${deviceId}::uuid FOR UPDATE`;
    const row = rows[0]; if (!row) throw new Error('zatca device not found');
    return { icv: Number(row.last_icv) + 1, pih: row.last_hash ?? GENESIS_PIH };
  }
  async setChainHash(deviceId: string, icv: number, hash: string, tx: TxHandle) { await asTx(tx).$executeRaw`UPDATE zatca_devices SET last_icv = ${icv}, last_hash = ${hash} WHERE id = ${deviceId}::uuid`; }
  async addSubmission(s: Parameters<ZatcaRepository['addSubmission']>[0], tx?: TxHandle) { const r = await this.db(tx).zatcaSubmission.create({ data: { invoiceId: s.invoiceId, deviceId: s.deviceId ?? undefined, mode: s.mode, requestHash: s.requestHash ?? undefined, responseCode: s.responseCode ?? undefined, response: (s.response ?? {}) as never, warnings: (s.warnings ?? []) as never, errors: (s.errors ?? []) as never, status: s.status }, select: { id: true } }); return r; }
  async listSubmissions(invoiceId: string): Promise<ZatcaSubmission[]> { const rows = await this.prisma.zatcaSubmission.findMany({ where: { invoiceId }, orderBy: { submittedAt: 'desc' } }); return rows.map((r) => ({ id: r.id, invoiceId: r.invoiceId, deviceId: r.deviceId, mode: r.mode as 'clearance' | 'reporting', requestHash: r.requestHash, responseCode: r.responseCode, status: r.status, warnings: r.warnings, errors: r.errors, submittedAt: r.submittedAt })); }
  async setInvoiceZatca(invoiceId: string, p: Parameters<ZatcaRepository['setInvoiceZatca']>[1], tx?: TxHandle) { await this.db(tx).invoice.update({ where: { id: invoiceId }, data: { zatcaStatus: p.zatcaStatus, zatcaHash: p.zatcaHash, zatcaQr: p.zatcaQr, zatcaXml: p.zatcaXml, zatcaIcv: p.zatcaIcv, zatcaPih: p.zatcaPih } }); }
}

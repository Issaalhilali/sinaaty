import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { InvoiceStatus } from '@sinaaty/shared-types';
import { asTx, PrismaService } from '../../../../prisma';
import type { TxHandle } from '../../../../common/ports/unit-of-work.port';
import type { Invoice, PartySnapshot } from '../../domain/invoice';
import type { InvoiceRepository, NewInvoice } from '../../domain/repositories';

const d = (v: Prisma.Decimal | null | undefined) => (v == null ? '0.00' : v.toFixed(2));
const include = { invoiceLines: { orderBy: { sortOrder: 'asc' } } } satisfies Prisma.InvoiceInclude;
type Row = Prisma.InvoiceGetPayload<{ include: typeof include }>;
const toInv = (r: Row): Invoice => ({ id: r.id, orgId: r.orgId, number: r.number, type: r.type, status: r.status, workOrderId: r.workOrderId, partOrderId: r.partOrderId, transportJobId: r.transportJobId, parentInvoiceId: r.parentInvoiceId, customerUserId: r.customerUserId, customerOrgId: r.customerOrgId, buyerSnapshot: r.buyerSnapshot as unknown as PartySnapshot, sellerSnapshot: r.sellerSnapshot as unknown as PartySnapshot, currency: r.currency, subtotal: d(r.subtotal), discountTotal: d(r.discountTotal), vatTotal: d(r.vatTotal), total: d(r.total), paidTotal: d(r.paidTotal), paymentTerms: r.paymentTerms, issueDate: r.issueDate, dueDate: r.dueDate, supplyDate: r.supplyDate, zatcaUuid: r.zatcaUuid, zatcaIcv: r.zatcaIcv == null ? null : r.zatcaIcv.toString(), zatcaPih: r.zatcaPih, zatcaXml: r.zatcaXml, zatcaHash: r.zatcaHash, zatcaQr: r.zatcaQr, zatcaStatus: r.zatcaStatus, notesAr: r.notesAr, voidedAt: r.voidedAt, voidReason: r.voidReason, createdAt: r.createdAt, lines: r.invoiceLines.map((l) => ({ id: l.id, workOrderItemId: l.workOrderItemId, descriptionAr: l.descriptionAr, descriptionEn: l.descriptionEn, quantity: l.quantity.toString(), unitPrice: d(l.unitPrice), discount: d(l.discount), vatRate: l.vatRate.toFixed(2), vatAmount: d(l.vatAmount), lineTotal: d(l.lineTotal), sortOrder: l.sortOrder })) });

@Injectable()
export class InvoicePrismaRepository implements InvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}
  private db(tx?: TxHandle) { return tx ? asTx(tx) : this.prisma; }
  /** Row-locked upsert on invoice_sequences → gapless per org/series/year. */
  async nextNumber(orgId: string, series: 'INV' | 'CN' | 'DN', year: number, tx?: TxHandle) {
    const rows = await this.db(tx).$queryRaw<Array<{ last_number: number }>>`
      INSERT INTO invoice_sequences (org_id, series, year, last_number) VALUES (${orgId}::uuid, ${series}, ${year}, 1)
      ON CONFLICT (org_id, series, year) DO UPDATE SET last_number = invoice_sequences.last_number + 1
      RETURNING last_number`;
    return `${series}-${year}-${String(rows[0]!.last_number).padStart(6, '0')}`;
  }
  async create(i: NewInvoice, tx?: TxHandle) {
    const r = await this.db(tx).invoice.create({ data: { orgId: i.orgId, number: i.number, type: i.type, status: i.status, workOrderId: i.workOrderId, partOrderId: i.partOrderId, transportJobId: i.transportJobId, parentInvoiceId: i.parentInvoiceId, customerUserId: i.customerUserId, customerOrgId: i.customerOrgId, buyerSnapshot: i.buyerSnapshot as unknown as Prisma.InputJsonValue, sellerSnapshot: i.sellerSnapshot as unknown as Prisma.InputJsonValue, subtotal: new Prisma.Decimal(i.subtotal), discountTotal: new Prisma.Decimal(i.discountTotal), vatTotal: new Prisma.Decimal(i.vatTotal), total: new Prisma.Decimal(i.total), paymentTerms: i.paymentTerms, issueDate: i.issueDate, dueDate: i.dueDate ?? undefined, supplyDate: i.supplyDate ?? undefined, zatcaUuid: i.zatcaUuid, zatcaHash: i.zatcaHash, zatcaQr: i.zatcaQr, zatcaStatus: i.zatcaStatus, notesAr: i.notesAr, createdBy: i.createdBy, invoiceLines: { create: i.lines.map((l) => ({ workOrderItemId: l.workOrderItemId ?? undefined, descriptionAr: l.descriptionAr, descriptionEn: l.descriptionEn ?? undefined, quantity: new Prisma.Decimal(l.quantity), unitPrice: new Prisma.Decimal(l.unitPrice), discount: new Prisma.Decimal(l.discount), vatRate: new Prisma.Decimal(l.vatRate), vatAmount: new Prisma.Decimal(l.vatAmount), lineTotal: new Prisma.Decimal(l.lineTotal), sortOrder: l.sortOrder })) } }, include });
    return toInv(r);
  }
  async findById(id: string) { const r = await this.prisma.invoice.findUnique({ where: { id }, include }); return r ? toInv(r) : null; }
  async findActiveByWorkOrder(workOrderId: string) { const r = await this.prisma.invoice.findFirst({ where: { workOrderId, type: { in: ['standard_tax', 'simplified_tax'] }, status: { notIn: ['void', 'refunded'] } }, include }); return r ? toInv(r) : null; }
  async list(q: { orgId?: string; customerUserId?: string; customerOrgId?: string; status?: InvoiceStatus[]; limit: number }) { const rows = await this.prisma.invoice.findMany({ where: { orgId: q.orgId, customerUserId: q.customerUserId, customerOrgId: q.customerOrgId, status: q.status ? { in: q.status } : undefined }, orderBy: { createdAt: 'desc' }, take: q.limit, include }); return rows.map(toInv); }
  async findByTransportJob(transportJobId: string, tx?: TxHandle) { const r = await this.db(tx).invoice.findFirst({ where: { transportJobId, status: { not: 'void' } }, orderBy: { createdAt: 'desc' }, include }); return r ? toInv(r) : null; }
  async setStatus(id: string, status: InvoiceStatus, extra?: { voidedAt?: Date; voidReason?: string; paidTotal?: string }, tx?: TxHandle) { await this.db(tx).invoice.update({ where: { id }, data: { status, voidedAt: extra?.voidedAt, voidReason: extra?.voidReason, paidTotal: extra?.paidTotal ? new Prisma.Decimal(extra.paidTotal) : undefined } }); }
}

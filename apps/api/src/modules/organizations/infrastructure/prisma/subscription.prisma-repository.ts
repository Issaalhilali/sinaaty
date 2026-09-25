import { Injectable } from '@nestjs/common';
import type { OrgType } from '@sinaaty/shared-types';
import { PrismaService } from '../../../../prisma';
import type { SubscriptionRepository } from '../../domain/repositories';

@Injectable()
export class SubscriptionPrismaRepository implements SubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}
  async listPlans(orgType?: OrgType) {
    const rows = await this.prisma.subscriptionPlan.findMany({ where: { isActive: true, ...(orgType ? { appliesTo: { has: orgType } } : {}) }, orderBy: { monthlyPrice: 'asc' } });
    return rows.map((p) => ({ id: p.id, code: p.code, nameAr: p.nameAr, nameEn: p.nameEn, appliesTo: p.appliesTo, monthlyPrice: p.monthlyPrice.toFixed(2), yearlyPrice: p.yearlyPrice?.toFixed(2) ?? null, commissionRateBps: p.commissionRateBps, noteFeeSar: p.noteFeeSar.toFixed(2), features: p.features }));
  }
  async findPlanByCode(code: string) { const p = await this.prisma.subscriptionPlan.findFirst({ where: { code, isActive: true } }); return p ? { id: p.id, code: p.code, appliesTo: p.appliesTo, commissionRateBps: p.commissionRateBps } : null; }
  async current(orgId: string) {
    const s = await this.prisma.subscription.findFirst({ where: { orgId, status: { in: ['trialing', 'active', 'past_due'] } }, orderBy: { createdAt: 'desc' }, include: { plan: { select: { code: true } } } });
    return s ? { id: s.id, planCode: s.plan.code, status: s.status, currentPeriodEnd: s.currentPeriodEnd } : null;
  }
  async subscribe(orgId: string, planId: string, cycle: 'monthly' | 'yearly') {
    const now = new Date(); const end = new Date(now);
    if (cycle === 'yearly') end.setFullYear(end.getFullYear() + 1); else end.setMonth(end.getMonth() + 1);
    await this.prisma.subscription.updateMany({ where: { orgId, status: { in: ['trialing', 'active', 'past_due'] } }, data: { status: 'cancelled' } });
    const s = await this.prisma.subscription.create({ data: { orgId, planId, status: 'active', billingCycle: cycle, currentPeriodStart: now, currentPeriodEnd: end }, select: { id: true } });
    return s;
  }
}

/**
 * Fleet spending policy — the fleet's own internal control, layered *on top of* the legal signature.
 * A repair is still signed by a person; the policy decides how many people must agree first, and whether
 * this workshop and this month's budget allow it at all.
 */
export interface FleetPolicy {
  id: string;
  orgId: string;
  nameAr: string;
  autoApproveBelow: string;
  requiresTwoApproversAbove: string | null;
  allowedOrgIds: string[] | null;
  monthlyBudget: string | null;
  isActive: boolean;
}

export type PolicyOutcome = 'auto' | 'one_approver' | 'two_approvers' | 'workshop_not_allowed' | 'over_budget';

export interface PolicyDecision {
  outcome: PolicyOutcome;
  approvalsRequired: number;
  /** true when the fleet's own rules stop this repair regardless of who signs. */
  blocked: boolean;
  reasonAr: string;
}

const num = (v: string | null | undefined) => (v == null ? null : Number(v));

/**
 * What the policy says about one repair.
 *
 * Order matters: a workshop outside the approved list, or a month already over budget, is refused before
 * anyone is asked to approve — sending an approval request the policy will not honour wastes the
 * approver's time and teaches people to ignore the app.
 */
export function decide(
  policy: FleetPolicy | null,
  input: { total: string; workshopOrgId: string; monthToDateSpend?: string },
): PolicyDecision {
  // No policy = the fleet has not set rules yet: one approver, the ordinary case.
  if (!policy || !policy.isActive) {
    return { outcome: 'one_approver', approvalsRequired: 1, blocked: false, reasonAr: 'لا توجد سياسة مفعّلة — يلزم اعتماد واحد.' };
  }

  if (policy.allowedOrgIds?.length && !policy.allowedOrgIds.includes(input.workshopOrgId)) {
    return { outcome: 'workshop_not_allowed', approvalsRequired: 0, blocked: true, reasonAr: 'هذه الورشة خارج قائمة الورش المعتمدة في سياسة الأسطول.' };
  }

  const total = Number(input.total);
  const budget = num(policy.monthlyBudget);
  if (budget != null) {
    const spent = Number(input.monthToDateSpend ?? '0');
    if (spent + total > budget) {
      return { outcome: 'over_budget', approvalsRequired: 0, blocked: true, reasonAr: `تجاوز ميزانية الشهر (${budget.toFixed(2)} ر.س) — المصروف ${spent.toFixed(2)} وهذا الأمر ${total.toFixed(2)}.` };
    }
  }

  const twoAbove = num(policy.requiresTwoApproversAbove);
  if (twoAbove != null && total > twoAbove) {
    return { outcome: 'two_approvers', approvalsRequired: 2, blocked: false, reasonAr: `المبلغ يتجاوز ${twoAbove.toFixed(2)} ر.س — يلزم اعتماد شخصين.` };
  }

  const auto = Number(policy.autoApproveBelow);
  if (auto > 0 && total < auto) {
    return { outcome: 'auto', approvalsRequired: 0, blocked: false, reasonAr: `أقل من حد الاعتماد التلقائي (${auto.toFixed(2)} ر.س).` };
  }

  return { outcome: 'one_approver', approvalsRequired: 1, blocked: false, reasonAr: 'يلزم اعتماد مسؤول الأسطول.' };
}

/** Roles inside a fleet organization that may decide on spending. */
export const FLEET_APPROVER_ROLES = ['owner', 'fleet_admin', 'fleet_approver'];
export const FLEET_READ_ROLES = [...FLEET_APPROVER_ROLES, 'fleet_viewer', 'accountant', 'manager'];

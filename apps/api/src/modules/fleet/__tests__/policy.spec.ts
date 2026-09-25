import { decide, type FleetPolicy } from '../domain/policy';

const policy = (over: Partial<FleetPolicy> = {}): FleetPolicy => ({
  id: 'p1', orgId: 'fleet1', nameAr: 'سياسة الصيانة', autoApproveBelow: '500.00',
  requiresTwoApproversAbove: '5000.00', allowedOrgIds: null, monthlyBudget: null, isActive: true, ...over,
});

describe('fleet spending policy', () => {
  it('a fleet with no policy still needs one approver — silence is not permission', () => {
    const d = decide(null, { total: '900.00', workshopOrgId: 'w1' });
    expect(d.outcome).toBe('one_approver');
    expect(d.approvalsRequired).toBe(1);
    expect(d.blocked).toBe(false);
  });

  it('an inactive policy behaves like no policy', () => {
    expect(decide(policy({ isActive: false }), { total: '100.00', workshopOrgId: 'w1' }).approvalsRequired).toBe(1);
  });

  it('small repairs pass without anyone being asked', () => {
    const d = decide(policy(), { total: '350.00', workshopOrgId: 'w1' });
    expect(d.outcome).toBe('auto');
    expect(d.approvalsRequired).toBe(0);
    expect(d.reasonAr).toContain('500.00');
  });

  it('the auto-approve limit is exclusive — exactly the limit still needs a person', () => {
    expect(decide(policy(), { total: '500.00', workshopOrgId: 'w1' }).outcome).toBe('one_approver');
  });

  it('large repairs need two different approvers', () => {
    const d = decide(policy(), { total: '7500.00', workshopOrgId: 'w1' });
    expect(d.outcome).toBe('two_approvers');
    expect(d.approvalsRequired).toBe(2);
  });

  it('a workshop outside the approved list is refused before anyone is asked', () => {
    const d = decide(policy({ allowedOrgIds: ['w1', 'w2'] }), { total: '100.00', workshopOrgId: 'w9' });
    expect(d.outcome).toBe('workshop_not_allowed');
    expect(d.blocked).toBe(true);
    expect(d.approvalsRequired).toBe(0);
    // Even an amount under the auto limit does not get through.
    expect(decide(policy({ allowedOrgIds: ['w1'] }), { total: '10.00', workshopOrgId: 'w9' }).blocked).toBe(true);
  });

  it('the monthly budget counts what is already committed, not only what is paid', () => {
    const p = policy({ monthlyBudget: '10000.00' });
    expect(decide(p, { total: '2000.00', workshopOrgId: 'w1', monthToDateSpend: '7000.00' }).blocked).toBe(false);
    const over = decide(p, { total: '4000.00', workshopOrgId: 'w1', monthToDateSpend: '7000.00' });
    expect(over.outcome).toBe('over_budget');
    expect(over.blocked).toBe(true);
    expect(over.reasonAr).toContain('10000.00');
  });

  it('budget is checked before the approver count — no point asking two people to approve the impossible', () => {
    const p = policy({ monthlyBudget: '1000.00' });
    expect(decide(p, { total: '9000.00', workshopOrgId: 'w1', monthToDateSpend: '0' }).outcome).toBe('over_budget');
  });

  it('a policy with no limits set falls back to one approver', () => {
    const bare = policy({ autoApproveBelow: '0', requiresTwoApproversAbove: null });
    expect(decide(bare, { total: '5.00', workshopOrgId: 'w1' }).outcome).toBe('one_approver');
  });
});

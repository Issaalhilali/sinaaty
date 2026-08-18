import { canTransition, isValidCr, isValidSaudiIban, isValidVat, ORG_TRANSITIONS, ROLES_BY_ORG_TYPE } from '../domain/organization';

describe('organizations domain', () => {
  it('state machine allows only declared transitions', () => {
    expect(canTransition('draft', 'pending_kyb')).toBe(true);
    expect(canTransition('pending_kyb', 'active')).toBe(true);
    expect(canTransition('pending_kyb', 'draft')).toBe(true); // rejected → fix & resubmit
    expect(canTransition('active', 'suspended')).toBe(true);
    expect(canTransition('suspended', 'active')).toBe(true);
    expect(canTransition('draft', 'active')).toBe(false); // must go through KYB
    expect(canTransition('closed', 'active')).toBe(false);
    expect(ORG_TRANSITIONS.closed).toEqual([]);
  });
  it('validators', () => {
    expect(isValidSaudiIban('SA03 8000 0000 6080 1016 7519'.replace(/\s/g, ''))).toBe(true);
    expect(isValidSaudiIban('SA038000')).toBe(false);
    expect(isValidVat('300000000000003')).toBe(true);
    expect(isValidVat('123')).toBe(false);
    expect(isValidCr('1010000001')).toBe(true);
  });
  it('roles per org type', () => {
    expect(ROLES_BY_ORG_TYPE.workshop).toContain('technician');
    expect(ROLES_BY_ORG_TYPE.scrapyard).not.toContain('technician');
    expect(ROLES_BY_ORG_TYPE.fleet_company).toContain('fleet_approver');
  });
});

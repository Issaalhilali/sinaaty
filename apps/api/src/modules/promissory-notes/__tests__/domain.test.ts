import { canTransitionNote, dunningStepsDue, isOverdue } from '../domain/note';
import { zipStore } from '../application/enforcement-bundle';
describe('promissory notes domain', () => {
  it('state machine', () => {
    expect(canTransitionNote('draft', 'issued')).toBe(true); expect(canTransitionNote('issued', 'closed')).toBe(true); expect(canTransitionNote('issued', 'partially_settled')).toBe(true);
    expect(canTransitionNote('closed', 'issued')).toBe(false); expect(canTransitionNote('cancelled', 'closed')).toBe(false); expect(canTransitionNote('issued', 'in_enforcement')).toBe(true);
  });
  it('overdue + dunning steps', () => {
    const due = new Date('2026-08-01'); const s = [1, 3, 7, 10];
    expect(isOverdue({ dueDate: due, status: 'issued' }, new Date('2026-08-02'))).toBe(true);
    expect(isOverdue({ dueDate: due, status: 'closed' }, new Date('2026-08-02'))).toBe(false);
    expect(dunningStepsDue(due, s, new Date('2026-08-01'))).toEqual([]);
    expect(dunningStepsDue(due, s, new Date('2026-08-04'))).toEqual([1, 2]);
    expect(dunningStepsDue(due, s, new Date('2026-08-20'))).toEqual([1, 2, 3, 4]);
  });
  it('zip writer produces a valid STORE archive with central directory', () => {
    const z = zipStore([{ name: 'a.txt', data: Buffer.from('hello') }, { name: 'ب.json', data: Buffer.from('{}') }]);
    expect(z.readUInt32LE(0)).toBe(0x04034b50); expect(z.readUInt32LE(z.length - 22)).toBe(0x06054b50); expect(z.readUInt16LE(z.length - 22 + 10)).toBe(2);
  });
});

import assert from 'assert';
import { reimbursedSelector, todayIso, sumAmounts } from '/imports/expenses/reimbursedFilter';

// Whether an expense with this reimbursedDate falls inside the selector's range.
const inRange = (selector, date) => {
  const range = selector.reimbursedDate || {};
  const d = new Date(date);
  return (!range.$gte || d >= range.$gte) && (!range.$lt || d < range.$lt);
};

describe('reimbursed expenses filter', function () {
  it('only selects reimbursed expenses', function () {
    assert.strictEqual(reimbursedSelector({}).status, 'reimbursed');
    assert.strictEqual(reimbursedSelector({}).reimbursedDate, undefined);
  });

  it('includes both the from and the to day', function () {
    const selector = reimbursedSelector({ from: '2026-10-01', to: '2026-10-31' });
    assert.strictEqual(inRange(selector, '2026-09-30'), false);
    assert.strictEqual(inRange(selector, '2026-10-01'), true);
    assert.strictEqual(inRange(selector, '2026-10-31'), true);
    assert.strictEqual(inRange(selector, '2026-11-01'), false);
  });

  it('leaves the range open forward without a to date', function () {
    const selector = reimbursedSelector({ from: '2026-10-18' });
    assert.strictEqual(inRange(selector, '2026-10-17'), false);
    assert.strictEqual(inRange(selector, '2030-01-01'), true);
  });

  it('gives the local date as YYYY-MM-DD', function () {
    assert.strictEqual(todayIso(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
  });

  it('sums amounts, counting a missing one as zero', function () {
    assert.strictEqual(sumAmounts([{ amount: 100 }, {}, { amount: 49.5 }]), 149.5);
    assert.strictEqual(sumAmounts([]), 0);
  });
});

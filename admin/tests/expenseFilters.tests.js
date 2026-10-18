import assert from 'assert';
import { reimbursedSelector, expenseListSelector, todayIso, sumAmounts } from '/imports/expenses/expenseFilters';

// Whether an expense with this date falls inside the selector's range.
const inRange = (selector, date, field = 'reimbursedDate') => {
  const range = selector[field] || {};
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

  describe('expense list', function () {
    it('selects everything without filters', function () {
      assert.deepStrictEqual(expenseListSelector({}), {});
      assert.deepStrictEqual(expenseListSelector({ status: '', from: '', to: '' }), {});
    });

    it('filters on status alone', function () {
      assert.deepStrictEqual(expenseListSelector({ status: 'rejected' }), { status: 'rejected' });
    });

    it('filters on the expense date, both days included', function () {
      const selector = expenseListSelector({ from: '2026-06-01', to: '2026-06-30' });
      assert.strictEqual(selector.status, undefined);
      assert.strictEqual(inRange(selector, '2026-05-31', 'date'), false);
      assert.strictEqual(inRange(selector, '2026-06-01', 'date'), true);
      assert.strictEqual(inRange(selector, '2026-06-30T15:00:00Z', 'date'), true);
      assert.strictEqual(inRange(selector, '2026-07-01', 'date'), false);
    });

    it('leaves the start open with only a to date', function () {
      const selector = expenseListSelector({ to: '2026-06-30' });
      assert.strictEqual(inRange(selector, '2020-01-01', 'date'), true);
    });
  });
});

import assert from 'assert';
import {
  BUDGET_SPENT_STATUSES,
  DEFAULT_BUDGET_SPENT_STATUSES,
  currentBudget,
  sortRevisions,
  spentFor,
  remaining,
} from '/imports/common/lib/expenseBudget';

const rev = (amount, setAt, createdAt = setAt) => ({
  amount,
  setAt: new Date(setAt),
  createdAt: new Date(createdAt),
});

describe('expenseBudget', function () {
  describe('currentBudget', function () {
    it('is null without revisions', function () {
      assert.strictEqual(currentBudget([]), null);
      assert.strictEqual(currentBudget(), null);
    });

    it('picks the revision with the latest date, whatever the order', function () {
      const revisions = [rev(5000, '2026-01-10'), rev(8000, '2026-06-01'), rev(6000, '2026-03-15')];
      assert.strictEqual(currentBudget(revisions).amount, 8000);
    });

    it('breaks a tie on date with the later createdAt', function () {
      const revisions = [
        rev(5000, '2026-03-01', '2026-03-01T09:00:00Z'),
        rev(7000, '2026-03-01', '2026-03-01T15:00:00Z'),
      ];
      assert.strictEqual(currentBudget(revisions).amount, 7000);
    });

    it('does not reorder the input', function () {
      const revisions = [rev(1, '2026-01-01'), rev(2, '2026-02-01')];
      sortRevisions(revisions);
      assert.strictEqual(revisions[0].amount, 1);
    });
  });

  describe('spentFor', function () {
    const totals = { submitted: 100, confirmed: 300, reimbursed: 500, rejected: 999 };

    it('defaults to confirmed plus reimbursed', function () {
      assert.deepStrictEqual(DEFAULT_BUDGET_SPENT_STATUSES, ['confirmed', 'reimbursed']);
      assert.strictEqual(spentFor(totals), 800);
    });

    it('counts exactly the chosen statuses', function () {
      assert.strictEqual(spentFor(totals, ['submitted', 'confirmed', 'reimbursed']), 900);
      assert.strictEqual(spentFor(totals, ['reimbursed']), 500);
      assert.strictEqual(spentFor(totals, ['submitted']), 100);
      assert.strictEqual(spentFor(totals, []), 0);
    });

    it('never counts rejected expenses, even when asked to', function () {
      assert.ok(!BUDGET_SPENT_STATUSES.includes('rejected'));
      assert.strictEqual(spentFor(totals, ['rejected', 'confirmed']), 300);
    });

    it('treats missing totals as zero', function () {
      assert.strictEqual(spentFor({}, BUDGET_SPENT_STATUSES), 0);
    });
  });

  describe('remaining', function () {
    it('subtracts what is spent', function () {
      assert.strictEqual(remaining(1000, 250), 750);
    });

    it('goes negative when overspent', function () {
      assert.strictEqual(remaining(1000, 1200), -200);
    });

    it('is null without a budget, but zero is a real budget', function () {
      assert.strictEqual(remaining(null, 100), null);
      assert.strictEqual(remaining(undefined, 100), null);
      assert.strictEqual(remaining(0, 100), -100);
    });
  });
});

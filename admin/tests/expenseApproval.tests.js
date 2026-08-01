import assert from 'assert';
import {
  REVIEWER_ROLES,
  approvableAccountIds,
  canReviewExpense,
  canViewExpense,
} from '/imports/common/lib/expenseApproval';

// Three accounts: Alice approves A, Bob approves B, C has no approvers at all.
const ACCOUNTS = [
  { _id: 'accA', name: 'Trä', approverMemberIds: ['alice'] },
  { _id: 'accB', name: 'Metall', approverMemberIds: ['bob', 'alice'] },
  { _id: 'accC', name: 'Kansli' },
];

const submitted = (over = {}) => ({
  _id: 'e1',
  memberId: 'carol',
  expenseAccountId: 'accA',
  status: 'submitted',
  ...over,
});

describe('expenseApproval', function () {
  describe('approvableAccountIds', function () {
    it('gives a role holder every account', function () {
      assert.deepStrictEqual(approvableAccountIds(ACCOUNTS, 'dave', true), [
        'accA',
        'accB',
        'accC',
      ]);
    });

    it('gives a role holder every account even without a member record', function () {
      assert.deepStrictEqual(approvableAccountIds(ACCOUNTS, null, true).length, 3);
    });

    it('limits a named approver to the accounts naming them', function () {
      assert.deepStrictEqual(approvableAccountIds(ACCOUNTS, 'alice', false), ['accA', 'accB']);
      assert.deepStrictEqual(approvableAccountIds(ACCOUNTS, 'bob', false), ['accB']);
    });

    it('gives nothing to someone named nowhere', function () {
      assert.deepStrictEqual(approvableAccountIds(ACCOUNTS, 'carol', false), []);
    });

    it('gives nothing without a member id', function () {
      assert.deepStrictEqual(approvableAccountIds(ACCOUNTS, undefined, false), []);
    });

    it('names the three reviewer roles', function () {
      assert.deepStrictEqual(REVIEWER_ROLES, ['admin', 'board', 'treasurer']);
    });
  });

  describe('canReviewExpense', function () {
    const alice = { memberId: 'alice', accountIds: ['accA', 'accB'] };

    it('lets an approver review a submitted expense on their account', function () {
      assert.strictEqual(canReviewExpense(submitted(), alice), true);
    });

    it('refuses an account the reviewer does not cover', function () {
      assert.strictEqual(canReviewExpense(submitted({ expenseAccountId: 'accC' }), alice), false);
    });

    it('refuses the reviewer’s own expense', function () {
      assert.strictEqual(canReviewExpense(submitted({ memberId: 'alice' }), alice), false);
    });

    it('refuses anything not submitted', function () {
      for (const status of ['pending', 'confirmed', 'rejected', 'reimbursed']) {
        assert.strictEqual(canReviewExpense(submitted({ status }), alice), false, status);
      }
    });

    it('refuses an expense with no account', function () {
      assert.strictEqual(
        canReviewExpense(submitted({ expenseAccountId: null }), alice),
        false
      );
    });

    it('refuses when nothing is passed', function () {
      assert.strictEqual(canReviewExpense(null, alice), false);
      assert.strictEqual(canReviewExpense(submitted()), false);
    });
  });

  describe('canViewExpense', function () {
    const alice = { memberId: 'alice', accountIds: ['accA', 'accB'] };

    it('lets a reviewer keep reading what they just rejected', function () {
      const rejected = submitted({ status: 'rejected', rejectionReason: 'Kvittot är oläsligt' });
      assert.strictEqual(canReviewExpense(rejected, alice), false);
      assert.strictEqual(canViewExpense(rejected, alice), true);
    });

    it('lets a reviewer read every post-submission status', function () {
      for (const status of ['submitted', 'confirmed', 'rejected', 'reimbursed']) {
        assert.strictEqual(canViewExpense(submitted({ status }), alice), true, status);
      }
    });

    it('hides another member’s unsubmitted draft', function () {
      assert.strictEqual(canViewExpense(submitted({ status: 'pending' }), alice), false);
    });

    it('hides an account the reviewer does not cover', function () {
      assert.strictEqual(
        canViewExpense(submitted({ status: 'confirmed', expenseAccountId: 'accC' }), alice),
        false
      );
    });

    it('says nothing about the reviewer’s own expense', function () {
      assert.strictEqual(canViewExpense(submitted({ memberId: 'alice' }), alice), false);
    });

    it('refuses when nothing is passed', function () {
      assert.strictEqual(canViewExpense(null, alice), false);
      assert.strictEqual(canViewExpense(submitted()), false);
    });
  });
});

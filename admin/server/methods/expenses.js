import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Expenses } from '/imports/common/collections/expenses';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { Members } from '/imports/common/collections/members';
import { memberForUser } from '/imports/common/server/memberForUser';
import { publishManagerEvent, ManagerEventType, blockquote } from '/imports/common/server/managerEvents';
import { adminLink } from '/imports/common/lib/links';
import { receiptUrlFor } from '/imports/common/server/receiptToken';
import { isInvoice } from '/imports/common/lib/expenseType';
import { check, Match } from 'meteor/check';
import { requireRole as requireUserRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import { expensesPage, reimbursedList, expensePayee } from '../expenses/lists';

// Build a Slack-mrkdwn description of an expense for manager events, with a
// link back to the admin app (settings.public.adminUrl; omitted if unset).
const expenseLine = async (expense, verb, { by, note } = {}) => {
  const member = await Members.findOneAsync(expense.memberId);
  const account = expense.expenseAccountId
    ? await ExpenseAccounts.findOneAsync(expense.expenseAccountId)
    : null;
  const byText = by ? ` by ${by}` : '';
  const noteText = note ? `\n${blockquote(note)}` : '';
  const url = adminLink(`expense/${expense._id}`);
  const link = url ? `\n<${url}|Open in admin>` : '';
  const kind = isInvoice(expense) ? 'invoice' : 'expense';
  return `*${member?.name || expense.memberId}*'s ${kind} of ${expense.amount} kr — ` +
    `\`${account?.name || "?"}\` was ${verb}${byText}.${noteText}${link}`;
};

const requireRole = async (roles) => {
  if (!Meteor.userId() || !(await Roles.userIsInRoleAsync(Meteor.userId(), roles))) {
    throw new Meteor.Error('not-authorized', 'Insufficient role');
  }
};

// Resolve the acting admin user's member record so we can enforce the
// no-self-confirmation / no-self-reimbursement rule. Returns null for accounts
// with no matching member (e.g. the bare `admin` login), which can never be an
// expense submitter. Matching uses any verified email (see memberForUser).
const actingMember = async () => memberForUser(await Meteor.userAsync());
const actingMemberId = async () => (await actingMember())?._id || null;

const getExpense = async (expenseId) => {
  const expense = await Expenses.findOneAsync(expenseId);
  if (!expense) throw new Meteor.Error('not-found', 'Expense not found');
  return expense;
};

const assertNotOwnExpense = (expense, me) => {
  if (me && me === expense.memberId) {
    throw new Meteor.Error('self-review', 'You cannot review your own expense');
  }
};

// Build a $set that records the actor only when we could resolve one. The
// schema's *By fields are optional String — setting them to null would fail
// Collection2 validation, so we omit the key for actors without a member
// record (e.g. the bare `admin` login).
const withActor = (fields, actorField, me) => (me ? { ...fields, [actorField]: me } : fields);

Meteor.methods({
  /** A page of the expenses or one of the work queues, with names. */
  async 'expenses.page'(options) {
    check(options, {
      view: String,
      filters: Match.Optional({ status: Match.Optional(String), from: Match.Optional(String), to: Match.Optional(String) }),
      search: Match.Optional(String),
      sort: Match.Optional(Match.OneOf(null, { field: String, direction: Match.OneOf('asc', 'desc') })),
      page: Match.Optional(Match.Integer),
      pageSize: Match.Optional(Match.Integer),
    });
    await requireUserRole(this.userId, DOMAIN_ROLES.expenses);
    return expensesPage({ ...options, sort: options.sort || undefined });
  },

  /** What was reimbursed or paid between two YYYY-MM-DD dates (either may be empty), and the sum. */
  async 'expenses.reimbursed'(range) {
    check(range, { from: Match.Optional(String), to: Match.Optional(String) });
    await requireUserRole(this.userId, DOMAIN_ROLES.expenses);
    return reimbursedList(range);
  },

  /** Who submitted an expense and where to pay them, who rejected it, and its account. */
  async 'expenses.payee'(expenseId) {
    check(expenseId, String);
    await requireUserRole(this.userId, DOMAIN_ROLES.expenses);
    return expensePayee(expenseId);
  },

  /**
   * Confirm a submitted expense (admin/board, not the submitter).
   */
  'expenses.confirm': async (expenseId) => {
    await requireRole(['admin', 'board']);
    const expense = await getExpense(expenseId);
    if (expense.status !== 'submitted') {
      throw new Meteor.Error('bad-state', 'Only submitted expenses can be confirmed');
    }
    const actor = await actingMember();
    const me = actor?._id || null;
    assertNotOwnExpense(expense, me);
    await Expenses.updateAsync(expenseId, {
      $set: withActor({ status: 'confirmed', confirmedAt: new Date() }, 'confirmedBy', me),
    });
    await publishManagerEvent(ManagerEventType.EXPENSE_CONFIRMED, {
      subject: isInvoice(expense) ? 'Invoice confirmed' : 'Expense confirmed',
      body: await expenseLine(expense, 'confirmed', { by: actor?.name || 'admin' }),
    });
    return true;
  },

  /**
   * Undo a confirmation: a confirmed expense goes back to submitted and waits
   * for review again. For approvals made by mistake, here or in the app. Same
   * roles as rejecting, never on your own expense, and only until it has been
   * reimbursed or paid.
   */
  'expenses.unconfirm': async (expenseId) => {
    await requireRole(['admin', 'board', 'treasurer']);
    const expense = await getExpense(expenseId);
    if (expense.status !== 'confirmed') {
      throw new Meteor.Error('bad-state', 'Only confirmed expenses can be un-confirmed');
    }
    const actor = await actingMember();
    assertNotOwnExpense(expense, actor?._id || null);
    // Conditional on the status, so a reimbursement made meanwhile is never undone.
    const changed = await Expenses.updateAsync(
      { _id: expenseId, status: 'confirmed' },
      { $set: { status: 'submitted' }, $unset: { confirmedAt: '', confirmedBy: '' } }
    );
    if (!changed) throw new Meteor.Error('bad-state', 'The expense is no longer confirmed');
    await publishManagerEvent(ManagerEventType.EXPENSE_UNCONFIRMED, {
      subject: isInvoice(expense) ? 'Invoice approval undone' : 'Expense approval undone',
      body: await expenseLine(expense, 'un-confirmed', { by: actor?.name || 'admin' }),
    });
    return true;
  },

  /**
   * Reject a submitted or confirmed expense with a reason. Confirmers
   * (admin/board) and the treasurer may reject.
   */
  'expenses.reject': async (expenseId, reason) => {
    await requireRole(['admin', 'board', 'treasurer']);
    const expense = await getExpense(expenseId);
    if (expense.status !== 'submitted' && expense.status !== 'confirmed') {
      throw new Meteor.Error('bad-state', 'Only submitted or confirmed expenses can be rejected');
    }
    if (!reason || !String(reason).trim()) {
      throw new Meteor.Error('missing-reason', 'A rejection reason is required');
    }
    const trimmedReason = String(reason).trim();
    const me = await actingMemberId();
    assertNotOwnExpense(expense, me);
    await Expenses.updateAsync(expenseId, {
      $set: withActor({
        status: 'rejected',
        rejectionReason: trimmedReason,
        rejectedAt: new Date(),
      }, 'rejectedBy', me),
      // Clear any prior confirmation so a rejected expense never still reads as confirmed.
      $unset: { confirmedAt: '', confirmedBy: '' },
    });
    await publishManagerEvent(ManagerEventType.EXPENSE_REJECTED, {
      subject: isInvoice(expense) ? 'Invoice rejected' : 'Expense rejected',
      body: await expenseLine(expense, 'rejected', { note: trimmedReason }),
    });
    return true;
  },

  /**
   * Mark a confirmed expense as reimbursed (treasurer, not the submitter). The
   * treasurer picks the BAS bookkeeping account (from settings) and the actual
   * reimbursement payment date (the Phase 2 verification date) in the same step.
   */
  'expenses.reimburse': async (expenseId, bookkeepingAccount, reimbursedDate) => {
    await requireRole(['treasurer', 'admin']);
    const expense = await getExpense(expenseId);
    if (expense.status !== 'confirmed') {
      throw new Meteor.Error('bad-state', 'Only confirmed expenses can be reimbursed');
    }
    const account = String(bookkeepingAccount || '').trim();
    const options = Meteor.settings.accounting?.expense?.accountOptions || [];
    if (!options.some((o) => o.account === account)) {
      throw new Meteor.Error('bad-account', 'Select a valid bookkeeping account');
    }
    const date = reimbursedDate ? new Date(reimbursedDate) : new Date();
    if (Number.isNaN(date.getTime())) {
      throw new Meteor.Error('bad-date', 'Invalid reimbursement date');
    }
    const me = await actingMemberId();
    assertNotOwnExpense(expense, me);
    await Expenses.updateAsync(expenseId, {
      $set: withActor({
        status: 'reimbursed',
        reimbursedAt: new Date(),
        bookkeepingAccount: account,
        reimbursedDate: date,
      }, 'reimbursedBy', me),
    });
    await publishManagerEvent(ManagerEventType.EXPENSE_REIMBURSED, {
      subject: isInvoice(expense) ? 'Invoice paid' : 'Expense reimbursed',
      body: await expenseLine(expense, isInvoice(expense) ? 'paid' : 'reimbursed'),
    });
    return true;
  },

  /**
   * Revert a reimbursed expense back to confirmed (admin/treasurer), e.g. when
   * a reimbursement was marked by mistake.
   */
  'expenses.unreimburse': async (expenseId) => {
    await requireRole(['treasurer', 'admin']);
    const expense = await getExpense(expenseId);
    if (expense.status !== 'reimbursed') {
      throw new Meteor.Error('bad-state', 'Only reimbursed expenses can be reverted');
    }
    await Expenses.updateAsync(expenseId, {
      $set: { status: 'confirmed' },
      $unset: { reimbursedAt: '', reimbursedBy: '' },
    });
    await publishManagerEvent(ManagerEventType.EXPENSE_UNREIMBURSED, {
      subject: isInvoice(expense) ? 'Payment undone' : 'Reimbursement undone',
      body: await expenseLine(expense, isInvoice(expense) ? 'un-marked as paid' : 'un-marked as reimbursed'),
    });
    return true;
  },

  /**
   * Return a signed, same-origin receipt URL for the admin review UI.
   */
  'expenses.adminGetReceiptUrl': async (expenseId) => {
    await requireRole(['admin', 'board', 'treasurer']);
    const expense = await getExpense(expenseId);
    return { url: receiptUrlFor(expense._id, expense.driveFileId) };
  },
});

import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Expenses } from '/imports/common/collections/expenses';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { Members } from '/imports/common/collections/members';
import { downloadImage } from '/imports/common/server/googleDrive';
import { memberForUser } from '/imports/common/server/memberForUser';
import { publishManagerEvent, ManagerEventType, blockquote } from '/imports/common/server/managerEvents';
import { adminLink } from '/imports/common/lib/links';

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
  return `*${member?.name || expense.memberId}*'s expense of ${expense.amount} kr — ` +
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
      subject: 'Expense confirmed',
      body: await expenseLine(expense, 'confirmed', { by: actor?.name || 'admin' }),
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
      subject: 'Expense rejected',
      body: await expenseLine(expense, 'rejected', { note: trimmedReason }),
    });
    return true;
  },

  /**
   * Mark a confirmed expense as reimbursed (treasurer, not the submitter).
   */
  'expenses.reimburse': async (expenseId) => {
    await requireRole(['treasurer', 'admin']);
    const expense = await getExpense(expenseId);
    if (expense.status !== 'confirmed') {
      throw new Meteor.Error('bad-state', 'Only confirmed expenses can be reimbursed');
    }
    const me = await actingMemberId();
    assertNotOwnExpense(expense, me);
    await Expenses.updateAsync(expenseId, {
      $set: withActor({ status: 'reimbursed', reimbursedAt: new Date() }, 'reimbursedBy', me),
    });
    await publishManagerEvent(ManagerEventType.EXPENSE_REIMBURSED, {
      subject: 'Expense reimbursed',
      body: await expenseLine(expense, 'reimbursed'),
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
      subject: 'Reimbursement undone',
      body: await expenseLine(expense, 'un-marked as reimbursed'),
    });
    return true;
  },

  /**
   * Return a receipt image as a data URI for the admin review UI.
   */
  'expenses.adminGetReceipt': async (expenseId) => {
    await requireRole(['admin', 'board', 'treasurer']);
    const expense = await getExpense(expenseId);
    const buffer = await downloadImage(expense.driveFileId);
    return { dataUri: `data:${expense.mimeType};base64,${buffer.toString('base64')}` };
  },
});

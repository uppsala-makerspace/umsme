import { Meteor } from "meteor/meteor";
import { Expenses } from "/imports/common/collections/expenses";
import { ExpenseAccounts } from "/imports/common/collections/expenseAccounts";
import { ExpenseBudgets } from "/imports/common/collections/expenseBudgets";
import { uploadImage, deleteImage } from "/imports/common/server/googleDrive";
import { publishManagerEvent, ManagerEventType, blockquote } from "/imports/common/server/managerEvents";
import { adminLink } from "/imports/common/lib/links";
import { receiptUrlFor } from "/imports/common/server/receiptToken";
import { Members } from "/imports/common/collections/members";
import { Groups } from "/imports/common/collections/groups";
import {
  findMemberForUser,
  expenseAccessAllowed,
  expenseAccountsFor,
  approvableAccountIdsFor,
  visibleExpenseAccountsFor,
  canViewExpenseAccount,
} from "./utils";
import { canReviewExpense, canViewExpense } from "/imports/common/lib/expenseApproval";
import { sortRevisions } from "/imports/common/lib/expenseBudget";
import { EXPENSE_TYPES, DOCUMENT_MIME, isInvoice } from "/imports/common/lib/expenseType";

const EDITABLE_STATES = ["pending", "rejected"];

// Bookkeeping account number → name, from the same settings list the admin
// app offers at reimbursement (settings.accounting.expense.accountOptions).
// Null when the list is missing or lacks the number; the number still shows.
const bookkeepingNames = () =>
  Object.fromEntries(
    (Meteor.settings.accounting?.expense?.accountOptions || []).map((o) => [o.account, o.name])
  );
const bookkeepingAccountName = (account) => (account && bookkeepingNames()[account]) || null;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB safety ceiling (client downscales)

const requireMember = async () => {
  const member = await findMemberForUser();
  if (!member) throw new Meteor.Error("not-found", "Member not found");
  if (!(await expenseAccessAllowed(member))) {
    throw new Meteor.Error("not-authorized", "Expenses are not enabled for this account");
  }
  return member;
};

// The account must be one the member is allowed to spend on (their groups'
// accounts, or any account for admin/board/allowlisted members).
const requireAllowedAccount = async (expenseAccountId, member) => {
  if (!expenseAccountId) return;
  const allowed = await expenseAccountsFor(member);
  if (!allowed.some((a) => a._id === expenseAccountId)) {
    throw new Meteor.Error("not-authorized", "That expense account is not available to you");
  }
};

const requireOwnExpense = async (expenseId, member) => {
  const expense = await Expenses.findOneAsync(expenseId);
  if (!expense) throw new Meteor.Error("not-found", "Expense not found");
  if (expense.memberId !== member._id) {
    throw new Meteor.Error("not-authorized", "Not your expense");
  }
  return expense;
};

/**
 * Load an expense the member is allowed to review, enforcing the approval rules
 * (submitted, not their own, on an account they approve for).
 */
const requireReviewableExpense = async (expenseId, member) => {
  const expense = await Expenses.findOneAsync(expenseId);
  if (!expense) throw new Meteor.Error("not-found", "Expense not found");
  const accountIds = await approvableAccountIdsFor(member);
  if (!canReviewExpense(expense, { memberId: member._id, accountIds })) {
    if (expense.memberId === member._id) {
      throw new Meteor.Error("self-review", "You cannot review your own expense");
    }
    throw new Meteor.Error("not-authorized", "You may not review this expense");
  }
  return expense;
};

/**
 * Slack-mrkdwn line describing a reviewed expense, mirroring the admin app's
 * expenseLine so the two produce comparable manager events.
 */
const reviewedLine = async (expense, verb, { by, note } = {}) => {
  const submitter = await Members.findOneAsync(expense.memberId, { fields: { name: 1 } });
  const account = expense.expenseAccountId
    ? await ExpenseAccounts.findOneAsync(expense.expenseAccountId)
    : null;
  const url = adminLink(`expense/${expense._id}`);
  const link = url ? `\n<${url}|Open in admin>` : "";
  const noteText = note ? `\n${blockquote(note)}` : "";
  return `*${submitter?.name || expense.memberId}*'s ${kindWord(expense)} of ${expense.amount} kr — ` +
    `\`${account?.name || "?"}\` was ${verb} by ${by}.${noteText}${link}`;
};

// "expense" or "invoice", for manager-event texts.
const kindWord = (expense) => (isInvoice(expense) ? "invoice" : "expense");

const checkType = (type) => {
  if (!EXPENSE_TYPES.includes(type)) throw new Meteor.Error("bad-type", "Unknown expense type");
};

// Decode an uploaded receipt or invoice: an image or a PDF.
const decodeDocument = (imageBase64, mimeType) => {
  if (!DOCUMENT_MIME.includes(mimeType)) {
    throw new Meteor.Error("bad-image", "Unsupported file type");
  }
  // Accept both raw base64 and data URIs.
  const base64 = String(imageBase64 || "").replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0) throw new Meteor.Error("bad-image", "Empty image");
  if (buffer.length > MAX_IMAGE_BYTES) throw new Meteor.Error("bad-image", "Image too large");
  return buffer;
};

Meteor.methods({
  /**
   * Create a draft (pending) expense from an uploaded receipt photo.
   * Uploads the image first so the schema-required driveFileId is present.
   * `expenseAccountId` preselects the account (used when starting from a
   * group's account page); it must be one the member may spend on.
   */
  "expenses.create": async (imageBase64, mimeType, expenseAccountId, type = "receipt") => {
    const member = await requireMember();
    checkType(type);
    await requireAllowedAccount(expenseAccountId, member);
    const buffer = decodeDocument(imageBase64, mimeType);
    const now = new Date();
    const driveFileId = await uploadImage({
      buffer,
      baseName: `${member._id}-${now.getTime()}`,
      mimeType,
      date: now,
    });
    return Expenses.insertAsync({
      memberId: member._id,
      type,
      driveFileId,
      mimeType,
      status: "pending",
      date: now,
      createdAt: now,
      ...(expenseAccountId ? { expenseAccountId } : {}),
    });
  },

  /**
   * Update editable fields of an own draft/submitted/rejected expense.
   */
  "expenses.update": async (
    expenseId,
    { type, amount, expenseAccountId, place, date, dueDate, note } = {}
  ) => {
    const member = await requireMember();
    const expense = await requireOwnExpense(expenseId, member);
    if (!EDITABLE_STATES.includes(expense.status)) {
      throw new Meteor.Error("not-editable", "This expense can no longer be edited");
    }
    const $set = {};
    const $unset = {};
    if (type !== undefined) {
      checkType(type);
      $set.type = type;
      if (type === "receipt") $unset.dueDate = "";
    }
    const resultingType = type !== undefined ? type : expense.type || "receipt";
    if (dueDate !== undefined && resultingType === "invoice") {
      if (dueDate) $set.dueDate = new Date(dueDate); else $unset.dueDate = "";
    }
    if (amount !== undefined) {
      if (amount === null || amount === "") {
        $unset.amount = "";
      } else if (typeof amount !== "number" || !(amount > 0)) {
        throw new Meteor.Error("bad-amount", "Amount must be a positive number");
      } else {
        $set.amount = amount;
      }
    }
    if (expenseAccountId !== undefined) {
      if (!expenseAccountId) {
        $unset.expenseAccountId = "";
      } else {
        const account = await ExpenseAccounts.findOneAsync(expenseAccountId);
        if (!account) throw new Meteor.Error("not-found", "Expense account not found");
        await requireAllowedAccount(expenseAccountId, member);
        $set.expenseAccountId = expenseAccountId;
      }
    }
    if (place !== undefined) {
      if (place) $set.place = place; else $unset.place = "";
    }
    if (date !== undefined) $set.date = new Date(date);
    if (note !== undefined) {
      if (note) $set.note = note; else $unset.note = "";
    }
    const modifier = {};
    if (Object.keys($set).length) modifier.$set = $set;
    if (Object.keys($unset).length) modifier.$unset = $unset;
    if (Object.keys(modifier).length) {
      await Expenses.updateAsync(expenseId, modifier);
    }
    return true;
  },

  /**
   * Replace the receipt photo on an editable expense.
   */
  "expenses.replacePhoto": async (expenseId, imageBase64, mimeType, type) => {
    const member = await requireMember();
    const expense = await requireOwnExpense(expenseId, member);
    if (!EDITABLE_STATES.includes(expense.status)) {
      throw new Meteor.Error("not-editable", "This expense can no longer be edited");
    }
    // The form may have switched the type without saving yet; save the
    // document with the type the member is looking at.
    const newType = type === undefined ? expense.type || "receipt" : type;
    checkType(newType);
    const buffer = decodeDocument(imageBase64, mimeType);
    const driveFileId = await uploadImage({
      buffer,
      baseName: `${member._id}-${Date.now()}`,
      mimeType,
      date: expense.date || new Date(),
    });
    await Expenses.updateAsync(expenseId, {
      $set: { driveFileId, mimeType, type: newType },
      ...(newType === "receipt" ? { $unset: { dueDate: "" } } : {}),
    });
    await deleteImage(expense.driveFileId);
    return true;
  },

  /**
   * Submit (or resubmit) an expense for review. Requires amount + account.
   */
  "expenses.submit": async (expenseId) => {
    const member = await requireMember();
    const expense = await requireOwnExpense(expenseId, member);
    if (expense.status !== "pending" && expense.status !== "rejected") {
      throw new Meteor.Error("bad-state", "Only pending or rejected expenses can be submitted");
    }
    if (!(expense.amount > 0)) {
      throw new Meteor.Error("missing-amount", "Enter an amount before submitting");
    }
    if (!expense.expenseAccountId) {
      throw new Meteor.Error("missing-account", "Choose an expense account before submitting");
    }
    if (isInvoice(expense) && !expense.dueDate) {
      throw new Meteor.Error("missing-due-date", "Enter the invoice's due date before submitting");
    }
    // Group membership can change between drafting and submitting.
    await requireAllowedAccount(expense.expenseAccountId, member);
    await Expenses.updateAsync(expenseId, {
      $set: { status: "submitted", submittedAt: new Date() },
      $unset: { rejectionReason: "" },
    });

    const account = await ExpenseAccounts.findOneAsync(expense.expenseAccountId);
    const url = adminLink(`expense/${expenseId}`);
    const link = url ? `\n<${url}|Open in admin>` : "";
    const note = expense.note ? `\n${blockquote(expense.note)}` : "";
    const due = isInvoice(expense) ? `, due ${expense.dueDate.toISOString().slice(0, 10)}` : "";
    await publishManagerEvent(ManagerEventType.EXPENSE_SUBMITTED, {
      subject: isInvoice(expense) ? "Invoice submitted" : "Expense submitted",
      body: `*${member.name}* submitted an ${kindWord(expense)} of ${expense.amount} kr — \`${account?.name || "?"}\`${due}.${note}${link}`,
    });
    return true;
  },

  /**
   * Retract a submitted expense back to pending so it can be edited again.
   */
  "expenses.retract": async (expenseId) => {
    const member = await requireMember();
    const expense = await requireOwnExpense(expenseId, member);
    if (expense.status !== "submitted") {
      throw new Meteor.Error("bad-state", "Only submitted expenses can be retracted");
    }
    await Expenses.updateAsync(expenseId, {
      $set: { status: "pending" },
      $unset: { submittedAt: "" },
    });

    const account = await ExpenseAccounts.findOneAsync(expense.expenseAccountId);
    const url = adminLink(`expense/${expenseId}`);
    const link = url ? `\n<${url}|Open in admin>` : "";
    await publishManagerEvent(ManagerEventType.EXPENSE_RETRACTED, {
      subject: isInvoice(expense) ? "Invoice recalled" : "Expense recalled",
      body: `*${member.name}* recalled an ${kindWord(expense)} of ${expense.amount} kr — \`${account?.name || "?"}\`.${link}`,
    });
    return true;
  },

  /**
   * Abort (delete) an own editable expense and its receipt photo.
   */
  "expenses.abort": async (expenseId) => {
    const member = await requireMember();
    const expense = await requireOwnExpense(expenseId, member);
    if (!EDITABLE_STATES.includes(expense.status)) {
      throw new Meteor.Error("not-removable", "This expense can no longer be removed");
    }
    await Expenses.removeAsync(expenseId);
    await deleteImage(expense.driveFileId);
    return true;
  },

  /**
   * List the current member's expenses, enriched with the account name.
   */
  "expenses.getMine": async () => {
    const member = await requireMember();
    const expenses = await Expenses.find(
      { memberId: member._id },
      { sort: { createdAt: -1 } }
    ).fetchAsync();
    const accounts = await ExpenseAccounts.find({}).fetchAsync();
    const accountById = Object.fromEntries(accounts.map((a) => [a._id, a]));
    return expenses.map((e) => ({
      ...e,
      accountName: e.expenseAccountId ? accountById[e.expenseAccountId]?.name || null : null,
    }));
  },

  /**
   * Fetch a single expense, enriched with the account name.
   *
   * Owners see their own. A reviewer may open anything that has been submitted
   * on an account they approve for, including what they have already approved
   * or rejected — reading it is wider than acting on it, which stays limited to
   * `submitted`. `isOwn`/`canApprove` tell the UI which view to render.
   */
  "expenses.getOne": async (expenseId) => {
    const member = await requireMember();
    const found = await Expenses.findOneAsync(expenseId);
    if (!found) throw new Meteor.Error("not-found", "Expense not found");
    const isOwn = found.memberId === member._id;
    const reviewer = isOwn
      ? null
      : { memberId: member._id, accountIds: await approvableAccountIdsFor(member) };
    const canApprove = !isOwn && canReviewExpense(found, reviewer);
    if (!isOwn && !canViewExpense(found, reviewer)) {
      throw new Meteor.Error("not-authorized", "Not your expense");
    }
    const expense = found;
    let accountName = null;
    if (expense.expenseAccountId) {
      const account = await ExpenseAccounts.findOneAsync(expense.expenseAccountId);
      accountName = account?.name || null;
    }
    // Who confirmed it, for the review trail on the expense's own page. Unset
    // when the confirmer had no member record (see withActor in admin).
    const confirmer = expense.confirmedBy
      ? await Members.findOneAsync(expense.confirmedBy, { fields: { name: 1 } })
      : null;
    const rejecter = expense.rejectedBy
      ? await Members.findOneAsync(expense.rejectedBy, { fields: { name: 1 } })
      : null;
    // A reviewer needs to know whose expense they are looking at.
    const submitter = isOwn
      ? null
      : await Members.findOneAsync(expense.memberId, { fields: { name: 1 } });
    return {
      ...expense,
      accountName,
      confirmedByName: confirmer?.name || null,
      bookkeepingAccountName: bookkeepingAccountName(expense.bookkeepingAccount),
      rejectedByName: rejecter?.name || null,
      receiptUrl: receiptUrlFor(expense._id, expense.driveFileId),
      isOwn,
      canApprove,
      submitterName: submitter?.name || null,
    };
  },

  /**
   * Expenses waiting for this member's review: submitted expenses on the
   * accounts they approve for, never their own. Also returns the ones they
   * reviewed in the last 24 hours, so the outcome of an action stays visible —
   * the same courtesy the certifier list gives.
   */
  "expenses.getToApprove": async () => {
    const member = await requireMember();
    const accountIds = await approvableAccountIdsFor(member);
    // No reviewable accounts at all: not an approver, so the tab stays hidden.
    if (accountIds.length === 0) {
      return { isApprover: false, pending: [], recentlyReviewed: [] };
    }

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pending = await Expenses.find(
      {
        status: "submitted",
        expenseAccountId: { $in: accountIds },
        memberId: { $ne: member._id },
      },
      { sort: { submittedAt: 1 } }
    ).fetchAsync();
    const recentlyReviewed = await Expenses.find(
      {
        expenseAccountId: { $in: accountIds },
        memberId: { $ne: member._id },
        $or: [
          { confirmedBy: member._id, confirmedAt: { $gte: dayAgo } },
          { rejectedBy: member._id, rejectedAt: { $gte: dayAgo } },
        ],
      },
      { sort: { submittedAt: -1 } }
    ).fetchAsync();

    const accounts = await ExpenseAccounts.find({ _id: { $in: accountIds } }).fetchAsync();
    const accountById = Object.fromEntries(accounts.map((a) => [a._id, a]));
    const memberIds = [...new Set([...pending, ...recentlyReviewed].map((e) => e.memberId))];
    const submitters = await Members.find(
      { _id: { $in: memberIds } },
      { fields: { name: 1 } }
    ).fetchAsync();
    const nameById = Object.fromEntries(submitters.map((m) => [m._id, m.name]));

    const enrich = (e) => ({
      _id: e._id,
      type: e.type || "receipt",
      dueDate: e.dueDate || null,
      amount: e.amount,
      date: e.date,
      place: e.place,
      note: e.note,
      status: e.status,
      submittedAt: e.submittedAt,
      accountName: accountById[e.expenseAccountId]?.name || null,
      submitterName: nameById[e.memberId] || null,
    });
    return {
      isApprover: true,
      pending: pending.map(enrich),
      recentlyReviewed: recentlyReviewed.map(enrich),
    };
  },

  /**
   * Approve a submitted expense (appointed approver or admin/board/treasurer,
   * never the submitter). Produces the same document state as the admin app's
   * expenses.confirm so the bookkeeping export stays consistent.
   */
  "expenses.approve": async (expenseId) => {
    const member = await requireMember();
    const expense = await requireReviewableExpense(expenseId, member);
    await Expenses.updateAsync(expenseId, {
      $set: { status: "confirmed", confirmedAt: new Date(), confirmedBy: member._id },
    });
    await publishManagerEvent(ManagerEventType.EXPENSE_CONFIRMED, {
      subject: "Expense confirmed",
      body: await reviewedLine(expense, "confirmed", { by: member.name }),
    });
    return true;
  },

  /**
   * Reject a submitted expense with a reason the submitter will see. Clears any
   * prior confirmation, as the admin app does, so a rejected expense never
   * still reads as confirmed.
   */
  "expenses.reject": async (expenseId, reason) => {
    const member = await requireMember();
    const expense = await requireReviewableExpense(expenseId, member);
    const trimmedReason = String(reason || "").trim();
    if (!trimmedReason) {
      throw new Meteor.Error("missing-reason", "A reason is required when rejecting");
    }
    await Expenses.updateAsync(expenseId, {
      $set: {
        status: "rejected",
        rejectionReason: trimmedReason,
        rejectedAt: new Date(),
        rejectedBy: member._id,
      },
      $unset: { confirmedAt: "", confirmedBy: "" },
    });
    await publishManagerEvent(ManagerEventType.EXPENSE_REJECTED, {
      subject: "Expense rejected",
      body: await reviewedLine(expense, "rejected", { by: member.name, note: trimmedReason }),
    });
    return true;
  },

  /**
   * Expense accounts for the submission picker: the accounts of the member's
   * groups (admin/board and allowlisted members see all).
   */
  "expenses.getAccounts": async () => {
    const member = await requireMember();
    const accounts = await expenseAccountsFor(member);
    return accounts.map((a) => ({
      _id: a._id,
      name: a.name,
      explanation: a.explanation,
    }));
  },

  /**
   * The accounts the member may open, for the accounts tab: the ones they may
   * spend on plus the ones they may review. Each is annotated with the groups
   * behind it, so a name like "Förbrukning" says whose it is, and with whether
   * the member may charge an expense to it — a treasurer sees every account
   * here but may not spend on all of them.
   */
  "expenses.getMyAccounts": async () => {
    const member = await requireMember();
    const { accounts, spendableIds } = await visibleExpenseAccountsFor(member);

    const groupIds = [...new Set(accounts.flatMap((a) => a.groupIds || []))];
    const groups = await Groups.find(
      { _id: { $in: groupIds } },
      { fields: { name: 1 } }
    ).fetchAsync();
    const groupById = Object.fromEntries(groups.map((g) => [g._id, g]));

    return accounts.map((a) => ({
      _id: a._id,
      name: a.name,
      explanation: a.explanation || null,
      canSpend: spendableIds.has(a._id),
      groupNames: (a.groupIds || [])
        .map((id) => groupById[id]?.name)
        .filter(Boolean),
    }));
  },

  /**
   * Budget overview for the accounts tab's budget view: every account the
   * member may look at (the same rule as expenses.getMyAccounts), with the
   * budget in force for the year and what has been claimed on it so far.
   *
   * The totals come per status so the client can switch between ways of
   * counting what is spent (see BUDGET_SPENT_MODES) without another call.
   * The year is that of the receipt date, as on the account page.
   */
  "expenses.getBudgetOverview": async (year) => {
    const member = await requireMember();
    const selectedYear = Number(year) || new Date().getFullYear();
    const { accounts } = await visibleExpenseAccountsFor(member);
    const accountIds = accounts.map((a) => a._id);

    const expenses = await Expenses.find(
      {
        expenseAccountId: { $in: accountIds },
        status: { $in: ["submitted", "confirmed", "reimbursed"] },
      },
      { fields: { expenseAccountId: 1, status: 1, amount: 1, date: 1, bookkeepingAccount: 1 } }
    ).fetchAsync();
    const budgets = await ExpenseBudgets.find({ expenseAccountId: { $in: accountIds } }).fetchAsync();

    const availableYears = [
      ...new Set([
        new Date().getFullYear(),
        ...expenses.map((e) => new Date(e.date).getFullYear()),
        ...budgets.map((b) => b.year),
      ]),
    ].sort((a, b) => b - a);

    // What has been booked where: the bookkeeping account is chosen when an
    // expense is reimbursed, so only reimbursed expenses count. Names come
    // from the same settings list the admin app offers at reimbursement.
    const names = bookkeepingNames();
    const totalsById = {};
    const bookedById = {};
    const bookedTotal = {};
    for (const e of expenses) {
      if (new Date(e.date).getFullYear() !== selectedYear) continue;
      const totals = (totalsById[e.expenseAccountId] ||= { submitted: 0, confirmed: 0, reimbursed: 0 });
      totals[e.status] += e.amount || 0;
      if (e.status === "reimbursed" && e.bookkeepingAccount) {
        const booked = (bookedById[e.expenseAccountId] ||= {});
        booked[e.bookkeepingAccount] = (booked[e.bookkeepingAccount] || 0) + (e.amount || 0);
        bookedTotal[e.bookkeepingAccount] = (bookedTotal[e.bookkeepingAccount] || 0) + (e.amount || 0);
      }
    }
    const bookkeepingRows = (byAccount = {}) =>
      Object.entries(byAccount)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([account, amount]) => ({ account, name: names[account] || null, amount }));

    const revisionsById = {};
    for (const b of budgets) {
      if (b.year !== selectedYear) continue;
      (revisionsById[b.expenseAccountId] ||= []).push(b);
    }

    // Names for the groups (to tell same-named accounts apart) and for whoever
    // last set each budget, one query each.
    const groupIds = [...new Set(accounts.flatMap((a) => a.groupIds || []))];
    const groupById = Object.fromEntries(
      (await Groups.find({ _id: { $in: groupIds } }, { fields: { name: 1 } }).fetchAsync())
        .map((g) => [g._id, g])
    );
    const current = Object.fromEntries(
      Object.entries(revisionsById).map(([id, revs]) => [id, sortRevisions(revs)[0]])
    );
    const setByIds = [...new Set(Object.values(current).map((r) => r.setBy).filter(Boolean))];
    const nameById = Object.fromEntries(
      (await Members.find({ _id: { $in: setByIds } }, { fields: { name: 1 } }).fetchAsync())
        .map((m) => [m._id, m.name])
    );

    return {
      year: selectedYear,
      availableYears,
      bookkeeping: bookkeepingRows(bookedTotal),
      accounts: accounts.map((a) => {
        const rev = current[a._id];
        return {
          _id: a._id,
          name: a.name,
          groupNames: (a.groupIds || []).map((id) => groupById[id]?.name).filter(Boolean),
          budget: rev ? rev.amount : null,
          lastRevision: rev
            ? {
                setAt: rev.setAt,
                comment: rev.comment || null,
                setByName: rev.setBy ? nameById[rev.setBy] || null : null,
                count: revisionsById[a._id].length,
              }
            : null,
          totals: totalsById[a._id] || { submitted: 0, confirmed: 0, reimbursed: 0 },
          bookkeeping: bookkeepingRows(bookedById[a._id]),
        };
      }),
    };
  },

  /**
   * All expenses booked on one account, for the group's overview. Visible to
   * active members of any of the account's groups (and admin/board): the group
   * needs to see what it has spent, so this deliberately shows other members'
   * expenses. Read-only — approval still happens in admin.
   *
   * Drafts (status 'pending') are excluded: they are not claims yet.
   */
  "expenses.getAccountExpenses": async (accountId, year) => {
    const member = await requireMember();
    const account = await ExpenseAccounts.findOneAsync(accountId);
    if (!account) throw new Meteor.Error("not-found", "Expense account not found");

    // Same rule as the accounts tab lists, so everything it links to opens.
    if (!(await canViewExpenseAccount(member, account))) {
      throw new Meteor.Error("not-authorized", "Not a member of this account's groups");
    }

    const all = await Expenses.find(
      { expenseAccountId: accountId, status: { $in: ["submitted", "confirmed", "rejected", "reimbursed"] } },
      { sort: { date: -1 } }
    ).fetchAsync();

    const availableYears = [
      ...new Set(all.map((e) => new Date(e.date).getFullYear())),
    ].sort((a, b) => b - a);

    const selectedYear = year ? Number(year) : null;
    const shown = selectedYear
      ? all.filter((e) => new Date(e.date).getFullYear() === selectedYear)
      : all;

    // Resolve member and confirmer names in one round trip.
    const memberIds = [
      ...new Set(shown.flatMap((e) => [e.memberId, e.confirmedBy]).filter(Boolean)),
    ];
    const nameById = {};
    for (const m of await Members.find(
      { _id: { $in: memberIds } },
      { fields: { name: 1 } }
    ).fetchAsync()) {
      nameById[m._id] = m.name;
    }

    return {
      account: { _id: account._id, name: account.name, explanation: account.explanation },
      availableYears,
      year: selectedYear,
      expenses: shown.map((e) => ({
        _id: e._id,
        memberName: nameById[e.memberId] || e.memberId,
        // Lets the client offer an edit shortcut for the caller's own
        // expenses without exposing member ids.
        isMine: e.memberId === member._id,
        status: e.status,
        type: e.type || "receipt",
        dueDate: e.dueDate || null,
        mimeType: e.mimeType || null,
        date: e.date,
        amount: e.amount || 0,
        place: e.place || null,
        note: e.note || null,
        submittedAt: e.submittedAt || null,
        confirmedByName: e.confirmedBy ? nameById[e.confirmedBy] || e.confirmedBy : null,
        confirmedAt: e.confirmedAt || null,
        rejectedAt: e.rejectedAt || null,
        bookkeepingAccount: e.bookkeepingAccount || null,
        bookkeepingAccountName: bookkeepingAccountName(e.bookkeepingAccount),
        reimbursedDate: e.reimbursedDate || null,
        reimbursedAt: e.reimbursedAt || null,
        // Signed capability URL — authorization happened above, so the group's
        // members can view the receipts backing their account's spending.
        receiptUrl: receiptUrlFor(e._id, e.driveFileId),
      })),
    };
  },

  /**
   * Distinct places of purchase across all expenses, for autocomplete
   * suggestions. Place names (store names) are not sensitive.
   */
  "expenses.getPlaces": async () => {
    await requireMember();
    const places = await Expenses.rawCollection().distinct("place", {
      place: { $exists: true, $ne: "" },
    });
    return places.sort((a, b) => a.localeCompare(b));
  },
});

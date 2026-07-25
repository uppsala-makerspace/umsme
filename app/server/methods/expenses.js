import { Meteor } from "meteor/meteor";
import { Expenses } from "/imports/common/collections/expenses";
import { ExpenseAccounts } from "/imports/common/collections/expenseAccounts";
import { uploadImage, deleteImage } from "/imports/common/server/googleDrive";
import { publishManagerEvent, ManagerEventType, blockquote } from "/imports/common/server/managerEvents";
import { adminLink } from "/imports/common/lib/links";
import { receiptUrlFor } from "/imports/common/server/receiptToken";
import { Members } from "/imports/common/collections/members";
import {
  findMemberForUser,
  expenseAccessAllowed,
  expenseAccountsFor,
  myActiveGroupIds,
  seesAllExpenseAccounts,
} from "./utils";

const EDITABLE_STATES = ["pending", "rejected"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB safety ceiling (client downscales)
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic"];

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

const decodeImage = (imageBase64, mimeType) => {
  if (!ALLOWED_MIME.includes(mimeType)) {
    throw new Meteor.Error("bad-image", "Unsupported image type");
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
  "expenses.create": async (imageBase64, mimeType, expenseAccountId) => {
    const member = await requireMember();
    await requireAllowedAccount(expenseAccountId, member);
    const buffer = decodeImage(imageBase64, mimeType);
    const now = new Date();
    const driveFileId = await uploadImage({
      buffer,
      baseName: `${member._id}-${now.getTime()}`,
      mimeType,
      date: now,
    });
    return Expenses.insertAsync({
      memberId: member._id,
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
  "expenses.update": async (expenseId, { amount, expenseAccountId, place, date, note } = {}) => {
    const member = await requireMember();
    const expense = await requireOwnExpense(expenseId, member);
    if (!EDITABLE_STATES.includes(expense.status)) {
      throw new Meteor.Error("not-editable", "This expense can no longer be edited");
    }
    const $set = {};
    const $unset = {};
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
  "expenses.replacePhoto": async (expenseId, imageBase64, mimeType) => {
    const member = await requireMember();
    const expense = await requireOwnExpense(expenseId, member);
    if (!EDITABLE_STATES.includes(expense.status)) {
      throw new Meteor.Error("not-editable", "This expense can no longer be edited");
    }
    const buffer = decodeImage(imageBase64, mimeType);
    const driveFileId = await uploadImage({
      buffer,
      baseName: `${member._id}-${Date.now()}`,
      mimeType,
      date: expense.date || new Date(),
    });
    await Expenses.updateAsync(expenseId, { $set: { driveFileId, mimeType } });
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
    await publishManagerEvent(ManagerEventType.EXPENSE_SUBMITTED, {
      subject: "Expense submitted",
      body: `*${member.name}* submitted an expense of ${expense.amount} kr — \`${account?.name || "?"}\`.${note}${link}`,
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
      subject: "Expense recalled",
      body: `*${member.name}* recalled an expense of ${expense.amount} kr — \`${account?.name || "?"}\`.${link}`,
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
   * Fetch a single own expense, enriched with the account name.
   */
  "expenses.getOne": async (expenseId) => {
    const member = await requireMember();
    const expense = await requireOwnExpense(expenseId, member);
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
    return {
      ...expense,
      accountName,
      confirmedByName: confirmer?.name || null,
      receiptUrl: receiptUrlFor(expense._id, expense.driveFileId),
    };
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

    if (!(await seesAllExpenseAccounts(member))) {
      const myGroups = await myActiveGroupIds(member);
      const shares = (account.groupIds || []).some((g) => myGroups.includes(g));
      if (!shares) throw new Meteor.Error("not-authorized", "Not a member of this account's groups");
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
        date: e.date,
        amount: e.amount || 0,
        place: e.place || null,
        note: e.note || null,
        submittedAt: e.submittedAt || null,
        confirmedByName: e.confirmedBy ? nameById[e.confirmedBy] || e.confirmedBy : null,
        confirmedAt: e.confirmedAt || null,
        rejectedAt: e.rejectedAt || null,
        bookkeepingAccount: e.bookkeepingAccount || null,
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

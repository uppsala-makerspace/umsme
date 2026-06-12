import { Meteor } from "meteor/meteor";
import { Expenses } from "/imports/common/collections/expenses";
import { ExpenseAccounts } from "/imports/common/collections/expenseAccounts";
import { uploadImage, deleteImage } from "/imports/common/server/googleDrive";
import { publishManagerEvent, ManagerEventType, blockquote } from "/imports/common/server/managerEvents";
import { adminLink } from "/imports/common/lib/links";
import { receiptUrlFor } from "/imports/common/server/receiptToken";
import { findMemberForUser } from "./utils";

const EDITABLE_STATES = ["pending", "rejected"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB safety ceiling (client downscales)
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic"];

// Expenses is restricted to an explicit allowlist of member emails. An absent
// or empty list means nobody — the feature stays disabled until configured.
const isExpenseAllowed = (member) => {
  const allowList = Meteor.settings?.private?.expenses?.allowList;
  return !!allowList?.length && allowList.includes(member.email);
};

const requireMember = async () => {
  const member = await findMemberForUser();
  if (!member) throw new Meteor.Error("not-found", "Member not found");
  if (!isExpenseAllowed(member)) {
    throw new Meteor.Error("not-authorized", "Expenses are not enabled for this account");
  }
  return member;
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
   */
  "expenses.create": async (imageBase64, mimeType) => {
    const member = await requireMember();
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
    return {
      ...expense,
      accountName,
      receiptUrl: receiptUrlFor(expense._id, expense.driveFileId),
    };
  },

  /**
   * Expense accounts for the submission picker.
   */
  "expenses.getAccounts": async () => {
    await requireMember();
    const accounts = await ExpenseAccounts.find({}, { sort: { name: 1 } }).fetchAsync();
    return accounts.map((a) => ({
      _id: a._id,
      name: a.name,
      explanation: a.explanation,
      accountNumber: a.accountNumber,
    }));
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

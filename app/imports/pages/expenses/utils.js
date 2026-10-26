import { isInvoice } from "/imports/common/lib/expenseType";

export const EXPENSE_STATUSES = ["pending", "submitted", "rejected", "confirmed", "reimbursed"];

export const EDITABLE_STATUSES = ["pending", "rejected"];

export const isEditable = (status) => EDITABLE_STATUSES.includes(status);

/**
 * A `returnTo` query parameter is only honoured when it is an in-app path, so
 * a crafted link can't bounce the member off to another site. Returns null for
 * anything else (missing, absolute URL, protocol-relative `//host`).
 */
export const safeReturnTo = (value) =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : null;

/**
 * The date a status actually refers to, with the i18n key that names it. The
 * label keys are singular ("Inskickad", "Bekräftad"), so they double as the
 * status label next to the date. Falls back to the receipt date when the
 * status timestamp is missing (older expenses).
 */
export const statusDate = (expense) => {
  switch (expense.status) {
    case "submitted":
      return { labelKey: "expenseDateLabelSubmitted", value: expense.submittedAt || expense.date };
    case "confirmed":
      return { labelKey: "expenseDateLabelConfirmed", value: expense.confirmedAt || expense.date };
    case "rejected":
      return { labelKey: "expenseDateLabelRejected", value: expense.rejectedAt || expense.date };
    case "reimbursed":
      // The actual payment date when known, else when it was marked paid. An
      // invoice is paid to the supplier rather than reimbursed to the member.
      return {
        labelKey: isInvoice(expense) ? "expenseDateLabelPaid" : "expenseDateLabelReimbursed",
        value: expense.reimbursedDate || expense.reimbursedAt || expense.date,
      };
    default:
      return { labelKey: "expenseDateLabelDate", value: expense.date };
  }
};

/**
 * The i18n key naming one expense's status. Same as `expenseStatus_<status>`
 * except that a reimbursed invoice reads "paid".
 */
export const statusLabelKey = (expense) =>
  expense.status === "reimbursed" && isInvoice(expense)
    ? "expenseStatus_paid"
    : `expenseStatus_${expense.status}`;

/**
 * The i18n key naming a status as a group of expenses — list headings, totals,
 * the status filter. The reimbursed group holds reimbursed receipts and paid
 * invoices alike, so it is named for both.
 */
export const statusGroupKey = (status) =>
  status === "reimbursed" ? "expenseStatus_reimbursedOrPaid" : `expenseStatus_${status}`;

export const formatDate = (date, lang) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString(lang === "sv" ? "sv-SE" : "en-US");
};

// For <input type="date"> value (YYYY-MM-DD).
export const toDateInputValue = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

// Shared with the activity and event forms.
export { downscaleImage } from "/imports/lib/images";

/** Largest document accepted; matches the server's limit. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/**
 * Read a File as-is into { base64, mimeType }, for PDF invoices that must not
 * go through the image downscaler.
 */
export const readFileAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-failed"));
    reader.onload = () =>
      resolve({
        base64: String(reader.result).replace(/^data:[^;]+;base64,/, ""),
        mimeType: file.type,
      });
    reader.readAsDataURL(file);
  });

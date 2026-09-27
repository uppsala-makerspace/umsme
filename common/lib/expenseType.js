/**
 * Receipt or invoice — the two kinds of expense.
 *
 * A receipt (kvitto) is something the member has already paid; the treasurer
 * reimburses them. An invoice (faktura) is not paid yet; the treasurer pays the
 * supplier. Everything up to confirmation is the same. Both end in status
 * `reimbursed`, which for an invoice reads "paid", so budgets, bookkeeping
 * export and bank matching need no special case.
 *
 * Pure: no Meteor, shared by both apps and unit tested in admin.
 */

export const EXPENSE_TYPES = ["receipt", "invoice"];

export const PDF_MIME = "application/pdf";

/** The document types an expense may carry, receipt or invoice alike: an image or a PDF. */
export const DOCUMENT_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic", PDF_MIME];

/** Whether this expense is an invoice. Anything else, including a missing type, is a receipt. */
export const isInvoice = (expense) => expense?.type === "invoice";

/** Whether the stored document is a PDF rather than an image. */
export const isPdf = (mimeType) => mimeType === PDF_MIME;

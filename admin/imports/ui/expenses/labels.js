import { EXPENSE_STATUSES } from '/imports/expenses/expenseFilters';

export { EXPENSE_STATUSES };

export const STATUS_COLOR = { pending: 'default', submitted: 'info', confirmed: 'primary', rejected: 'error', reimbursed: 'success' };

/** A reimbursed invoice is paid; the stored status is the same. */
export const statusText = (expense) => (expense?.status === 'reimbursed' && expense?.type === 'invoice' ? 'paid' : expense?.status);

export const kr = (n) => `${Number(n).toLocaleString('sv-SE', { maximumFractionDigits: 2 })} kr`;

/** A date as the day it falls on here, YYYY-MM-DD, as the Blaze pages showed them; '' for none. */
export const isoDay = (date) => (date ? new Date(date).toLocaleDateString('sv-SE') : '');

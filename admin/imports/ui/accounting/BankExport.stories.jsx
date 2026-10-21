import { fn } from 'storybook/test';
import { BankExport } from './BankExport';

const summary = {
  expenses: { count: 3, sum: -4120.5 }, memberPayments: { count: 12, sum: 9800 }, standardIncome: { count: 2, sum: 300 },
  remaining: { count: 4, sum: -74120 }, totalRows: 21, totalSum: -68140.5,
  control: { bankLegs: 5979.5, remainingSum: -74120, holds: true },
  pools: { reimbursedExpenses: 5, expensesMissingReimbursedDate: 1, expensesMissingAccount: 0, callbackPayments: 14, bankImportPayments: 3 },
};
const result = {
  summary,
  flags: [{ rowNr: 7, reason: 'two candidates', detail: 'Swish +46700000004 matches two payments' }],
  diagnostics: [{ rowNr: 2, text: 'Pg-bet. via internet', belopp: -74000, why: 'no expense with this amount' }],
};

export default {
  title: 'Accounting/BankExport',
  component: BankExport,
  args: { onFile: fn(), onDownloadSie: fn(), onDownloadRemaining: fn() },
};

export const Start = {};
export const Processing = { args: { busy: true } };
export const Result = { args: { result } };
export const Mismatch = { args: { result: { ...result, summary: { ...summary, control: { ...summary.control, holds: false } } } } };
export const Refused = { args: { error: 'Insufficient role' } };

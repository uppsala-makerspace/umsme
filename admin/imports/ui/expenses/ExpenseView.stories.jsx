import { fn } from 'storybook/test';
import { ExpenseView } from './ExpenseView';

const expense = { _id: 'e1', memberId: 'm2', type: 'receipt', status: 'submitted', date: new Date(2026, 9, 12), createdAt: new Date(2026, 9, 12), amount: 249, place: 'Bauhaus', note: 'Glasyr', mimeType: 'image/svg+xml' };
const payee = { memberName: 'Sara Styrgrupp', bank: { name: 'Swedbank', holder: 'Sara Styrgrupp', clearing: '8327-9', number: '123 456 789-0', combined: '8327912345678900' }, accountName: 'Keramik', accountDimensions: '6:KERAMIK' };
const receipt = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420"><rect width="300" height="420" fill="#fffef8" stroke="#ccc"/><text x="150" y="60" text-anchor="middle" font-family="monospace" font-size="20">Bauhaus</text><text x="20" y="360" font-family="monospace" font-size="18">Summa: 249 kr</text></svg>')}`;

export default {
  title: 'Expenses/ExpenseView',
  component: ExpenseView,
  args: {
    expense, payee, receipt, today: '2026-10-20', accountOptions: [{ account: '5010', name: 'Lokalkostnader' }, { account: '6110', name: 'Kontorsmateriel' }],
    onConfirm: fn(), onUnconfirm: fn(), onReject: fn(), onReimburse: fn(), onUnreimburse: fn(),
  },
};

export const Submitted = {};
export const Confirmed = { args: { expense: { ...expense, status: 'confirmed' } } };
export const PaidInvoice = { args: { expense: { ...expense, type: 'invoice', status: 'reimbursed', dueDate: new Date(2026, 9, 30), reimbursedDate: new Date(2026, 9, 18), bookkeepingAccount: '5010' } } };
export const Rejected = { args: { expense: { ...expense, status: 'rejected', rejectionReason: 'Kvittot går inte att läsa.', rejectedAt: new Date(2026, 9, 14), rejectedBy: 'm5' }, payee: { ...payee, rejectedByName: 'Bertil Styrelse' } } };
export const NoBankAccount = { args: { payee: { ...payee, bank: null }, receipt: null } };

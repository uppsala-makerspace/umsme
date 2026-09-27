import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';
import { Roles } from 'meteor/roles';
import { Expenses } from '/imports/common/collections/expenses';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { Members } from '/imports/common/collections/members';
import { models } from '/imports/common/lib/models';
import { extractor, dateViewFunction } from '/imports/common/lib/fieldsUtils';

const STATUS_CLASS = {
  pending: 'default',
  submitted: 'info',
  confirmed: 'primary',
  rejected: 'danger',
  reimbursed: 'success',
};

const expenseDefaults = {
  filter: [
    'driveFileId', 'mimeType', 'note', 'rejectionReason', 'createdAt',
    'submittedAt', 'confirmedAt', 'confirmedBy', 'rejectedAt', 'rejectedBy',
    'reimbursedAt', 'reimbursedBy', 'bookkeepingAccount', 'reimbursedDate',
  ],
  enhance: [
    {
      data: 'type',
      render(value) {
        return value === 'invoice'
          ? new Spacebars.SafeString('<span class="label label-warning">invoice</span>')
          : 'receipt';
      },
    },
    { data: 'date', sortOrder: 0, sortDirection: 'descending', render: dateViewFunction(true) },
    // Coloured like other deadlines: red when passed, amber when close.
    { data: 'dueDate', render: dateViewFunction(false) },
    {
      data: 'memberId',
      title: 'Member',
      render(value) {
        const member = Members.findOne(value);
        return member ? member.name : value;
      },
    },
    {
      data: 'expenseAccountId',
      title: 'Account',
      render(value) {
        if (!value) return '';
        const account = ExpenseAccounts.findOne(value);
        return account ? account.name : value;
      },
    },
    {
      data: 'status',
      render(value) {
        const cls = STATUS_CLASS[value] || 'default';
        return new Spacebars.SafeString(`<span class="label label-${cls}">${value}</span>`);
      },
    },
  ],
};

const allow = (userID) => userID && Roles.userIsInRoleAsync(userID, ['admin', 'board', 'treasurer']);

new Tabular.Table({
  name: 'Expenses',
  autoWidth: false,
  collection: Expenses,
  order: [[0, 'desc']],
  columns: extractor(models.expense, expenseDefaults),
  allow,
});

// Invoices waiting to be paid, the one due soonest first. A table of its own
// only because the sort order differs.
const invoiceColumns = extractor(models.expense, expenseDefaults)();
new Tabular.Table({
  name: 'InvoicesToPay',
  autoWidth: false,
  collection: Expenses,
  order: [[invoiceColumns.findIndex((c) => c.data === 'dueDate'), 'asc']],
  columns: invoiceColumns,
  allow,
});

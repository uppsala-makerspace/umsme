import React, { useEffect, useState } from 'react';
import { todayIso } from '/imports/expenses/expenseFilters';
import { useNavigate } from '../navigation';
import { useServerList } from '../components/useServerList';
import { useQueryParams } from '../components/useQueryParams';
import { ExpenseList } from './ExpenseList';
import { ReimburseQueue } from './ReimburseQueue';
import { expensePage, reimbursedExpenses } from './data';

/** /expenses: every expense, narrowed by status and date, the filters in the URL. */
export const ExpensesPage = () => {
  const [filters, setFilters] = useQueryParams(['status', 'from', 'to']);
  const list = useServerList(expensePage('all', filters), { sort: { field: 'date', direction: 'desc' }, deps: [filters.status, filters.from, filters.to] });
  return (
    <ExpenseList title="Expenses" list={list} filters={filters}
      onFilter={(field, value) => setFilters({ [field]: value })} onClearFilters={() => setFilters({ status: '', from: '', to: '' })} />
  );
};

/** /expenses/confirm: what waits to be confirmed. */
export const ConfirmQueuePage = () => (
  <ExpenseList title="Expenses to confirm" list={useServerList(expensePage('confirm'), { sort: { field: 'date', direction: 'desc' } })} />
);

// A cleared From means no lower bound; with none in the URL the range starts today.
const NO_FROM = 'any';

/** /expenses/reimburse: what the treasurer pays, and what has been paid. */
export const ReimburseQueuePage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useQueryParams(['view', 'from', 'to']);
  const invoices = useServerList(expensePage('invoices'), { sort: { field: 'dueDate', direction: 'asc' } });
  const receipts = useServerList(expensePage('receipts'), { sort: { field: 'date', direction: 'desc' } });
  const range = { from: query.from === NO_FROM ? '' : (query.from || todayIso()), to: query.to };
  const [reimbursed, setReimbursed] = useState(null);
  useEffect(() => {
    if (query.view !== 'reimbursed') return undefined;
    let current = true;
    setReimbursed(null);
    reimbursedExpenses(range).then((r) => { if (current) setReimbursed(r); });
    return () => { current = false; };
  }, [query.view, range.from, range.to]);
  return (
    <ReimburseQueue
      view={query.view === 'reimbursed' ? 'reimbursed' : 'queue'}
      onViewChange={(view) => setQuery(view === 'reimbursed' ? { view } : { view: '', from: '', to: '' })}
      invoices={invoices} receipts={receipts} range={range} reimbursed={reimbursed}
      onRangeChange={(field, value) => setQuery(field === 'from' ? { from: value || NO_FROM } : { to: value })}
      onOpen={(id) => navigate(`/expense/${id}`)}
    />
  );
};

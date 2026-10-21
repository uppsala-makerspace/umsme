import React, { useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import { todayIso } from '/imports/expenses/expenseFilters';
import { ExpenseView } from './ExpenseView';
import {
  useExpense, expensePayee, receiptUrl, accountingConfig, confirmExpense, unconfirmExpense, rejectExpense,
  reimburseExpense, unreimburseExpense,
} from './data';

/** /expense/:_id */
export const ExpenseViewPage = ({ _id }) => {
  const { loading, expense } = useExpense(_id);
  const [payee, setPayee] = useState(null);
  const [receipt, setReceipt] = useState(undefined);
  const [accountOptions, setAccountOptions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const status = expense?.status;
  useEffect(() => { expensePayee(_id).then(setPayee, (e) => setError(e.reason || e.message)); }, [_id, status]);
  useEffect(() => {
    receiptUrl(_id).then(setReceipt, () => setReceipt(null));
    accountingConfig().then((c) => setAccountOptions(c?.expense?.accountOptions || []), () => {});
  }, [_id]);

  if (loading) return <Typography color="text.secondary">Loading…</Typography>;
  if (!expense) return <Typography>Expense not found.</Typography>;
  const act = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e.reason || e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <ExpenseView
      key={`${expense._id}-${status}`}
      expense={expense} payee={payee} receipt={receipt} accountOptions={accountOptions} busy={busy} error={error} today={todayIso()}
      onConfirm={() => act(() => confirmExpense(_id))}
      onUnconfirm={() => act(() => unconfirmExpense(_id))}
      onReject={(reason) => act(() => rejectExpense(_id, reason))}
      onReimburse={(account, day) => act(() => reimburseExpense(_id, account, day))}
      onUnreimburse={() => act(() => unreimburseExpense(_id))}
    />
  );
};

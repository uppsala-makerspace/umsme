import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect, useCallback } from "react";
import { Navigate, useParams } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import AccountExpenses from "./AccountExpenses";

/**
 * Overview of everything booked on one expense account. Open to active members
 * of any of the account's groups (the server enforces that) — the page is not
 * scoped to a group, since an account can belong to several. Read-only;
 * approval still happens in admin.
 */
export default () => {
  const { accountId } = useParams();
  const user = useTracker(() => Meteor.user());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  // null = all years; defaults to the current year so the common case is one
  // year's spending, and switches to "all" only when asked.
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await Meteor.callAsync("expenses.getAccountExpenses", accountId, year);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }, [accountId, year]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user?._id, fetchData]);

  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  // Creating and editing happen on the expense pages; they return here when
  // done, so the member stays in the account's context.
  const returnTo = `returnTo=${encodeURIComponent(`/expense-accounts/${accountId}`)}`;

  return (
    <Layout>
      <AccountExpenses
        loading={loading}
        error={error}
        data={data}
        newExpenseTo={`/expenses/new?account=${encodeURIComponent(accountId)}&${returnTo}`}
        expenseTo={(expenseId) => `/expenses/${expenseId}?${returnTo}`}
        onYearChange={setYear}
      />
    </Layout>
  );
};

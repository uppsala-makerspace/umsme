import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect, useCallback } from "react";
import { Navigate, useParams, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import ExpenseDetail from "./ExpenseDetail.jsx";
import { safeReturnTo } from "../utils";

export default () => {
  const { expenseId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Where to go when done. Set when the expense was started from (or opened
  // from) a group's expense account page; otherwise the member's own list.
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const doneTo = returnTo || "/expenses";
  const user = useTracker(() => Meteor.user());
  const [loading, setLoading] = useState(true);
  const [expense, setExpense] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const exp = await Meteor.callAsync("expenses.getOne", expenseId);
      setExpense(exp);
      const accs = await Meteor.callAsync("expenses.getAccounts");
      setAccounts(accs);
      const places = await Meteor.callAsync("expenses.getPlaces");
      setPlaceSuggestions(places);
      setError(null);
    } catch (err) {
      console.error("Error fetching expense:", err);
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }, [expenseId]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user?._id, fetchData]);

  // Server refusals (e.g. a PDF turned into a receipt) are shown rather than
  // lost; the form keeps what the member typed.
  const reportError = (err) => alert(err.reason || err.message);
  const onSave = async (fields) => {
    try {
      await Meteor.callAsync("expenses.update", expenseId, fields);
    } catch (err) {
      reportError(err);
      return;
    }
    navigate(doneTo);
  };
  const onSubmit = async (fields) => {
    try {
      await Meteor.callAsync("expenses.update", expenseId, fields);
      await Meteor.callAsync("expenses.submit", expenseId);
    } catch (err) {
      reportError(err);
      return;
    }
    // Came from an account page: the member is done, take them back there.
    // On the standalone page, stay and show the submitted state as before.
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    await fetchData();
  };
  const onRetract = async () => {
    await Meteor.callAsync("expenses.retract", expenseId);
    await fetchData();
  };
  const onReplacePhoto = async ({ base64, mimeType, type }) => {
    try {
      await Meteor.callAsync("expenses.replacePhoto", expenseId, base64, mimeType, type);
    } catch (err) {
      reportError(err);
      return;
    }
    await fetchData();
  };
  const onAbort = async () => {
    await Meteor.callAsync("expenses.abort", expenseId);
    navigate(doneTo);
  };
  // Reviewing someone else's expense: stay on the page and refetch, so the
  // reviewer sees the resulting state (and the buttons disappear).
  const onApprove = async () => {
    try {
      await Meteor.callAsync("expenses.approve", expenseId);
      await fetchData();
    } catch (err) {
      alert(err.reason || err.message);
    }
  };
  const onReject = async (reason) => {
    try {
      await Meteor.callAsync("expenses.reject", expenseId, reason);
      await fetchData();
    } catch (err) {
      alert(err.reason || err.message);
    }
  };

  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      <ExpenseDetail
        loading={loading}
        error={error}
        expense={expense}
        accounts={accounts}
        placeSuggestions={placeSuggestions}
        receiptUrl={expense?.receiptUrl || null}
        onSave={onSave}
        onSubmit={onSubmit}
        onRetract={onRetract}
        onAbort={onAbort}
        onReplacePhoto={onReplacePhoto}
        onApprove={onApprove}
        onReject={onReject}
      />
    </Layout>
  );
};

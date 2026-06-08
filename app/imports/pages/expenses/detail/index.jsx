import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect, useCallback } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import ExpenseDetail from "./ExpenseDetail.jsx";

export default () => {
  const { expenseId } = useParams();
  const navigate = useNavigate();
  const user = useTracker(() => Meteor.user());
  const [loading, setLoading] = useState(true);
  const [expense, setExpense] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [receiptDataUri, setReceiptDataUri] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const exp = await Meteor.callAsync("expenses.getOne", expenseId);
      setExpense(exp);
      const accs = await Meteor.callAsync("expenses.getAccounts");
      setAccounts(accs);
      const receipt = await Meteor.callAsync("expenses.getReceipt", expenseId);
      setReceiptDataUri(receipt?.dataUri || null);
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

  const onSave = async (fields) => {
    await Meteor.callAsync("expenses.update", expenseId, fields);
    navigate("/expenses");
  };
  const onSubmit = async (fields) => {
    await Meteor.callAsync("expenses.update", expenseId, fields);
    await Meteor.callAsync("expenses.submit", expenseId);
    await fetchData();
  };
  const onRetract = async () => {
    await Meteor.callAsync("expenses.retract", expenseId);
    await fetchData();
  };
  const onReplacePhoto = async ({ base64, mimeType }) => {
    await Meteor.callAsync("expenses.replacePhoto", expenseId, base64, mimeType);
    await fetchData();
  };
  const onAbort = async () => {
    await Meteor.callAsync("expenses.abort", expenseId);
    navigate("/expenses");
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
        receiptDataUri={receiptDataUri}
        onSave={onSave}
        onSubmit={onSubmit}
        onRetract={onRetract}
        onAbort={onAbort}
        onReplacePhoto={onReplacePhoto}
      />
    </Layout>
  );
};

import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import Expenses from "./Expenses.jsx";

export default () => {
  const user = useTracker(() => Meteor.user());
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [toApprove, setToApprove] = useState([]);
  const [recentlyReviewed, setRecentlyReviewed] = useState([]);
  const [isApprover, setIsApprover] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const mine = await Meteor.callAsync("expenses.getMine");
      setExpenses(mine);
      // Sequential, never Promise.all — see app/CLAUDE.md.
      const review = await Meteor.callAsync("expenses.getToApprove");
      setToApprove(review.pending);
      setRecentlyReviewed(review.recentlyReviewed);
      setIsApprover(review.isApprover);
      const myAccounts = await Meteor.callAsync("expenses.getMyAccounts");
      setAccounts(myAccounts);
      setError(null);
    } catch (err) {
      console.error("Error fetching expenses:", err);
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user?._id, fetchData]);

  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      <Expenses
        loading={loading}
        error={error}
        expenses={expenses}
        isApprover={isApprover}
        toApprove={toApprove}
        recentlyReviewed={recentlyReviewed}
        accounts={accounts}
      />
    </Layout>
  );
};

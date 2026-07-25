import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect, useCallback } from "react";
import { Navigate, useParams } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import AccountExpenses from "./AccountExpenses";

/**
 * Overview of everything booked on one of a group's expense accounts. Open to
 * the group's active members (the server enforces that); read-only — approval
 * still happens in admin.
 */
export default () => {
  const { groupId, accountId } = useParams();
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

  return (
    <Layout>
      <AccountExpenses
        loading={loading}
        error={error}
        data={data}
        backTo={`/groups/${groupId}`}
        onYearChange={setYear}
      />
    </Layout>
  );
};

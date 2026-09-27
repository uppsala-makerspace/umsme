import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import NewExpense from "./NewExpense";
import { safeReturnTo } from "../utils";

export default () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useTracker(() => Meteor.user());
  const [busy, setBusy] = useState(false);
  // Started from a group's expense account page: preselect it and carry the
  // page to return to once the expense is finished.
  const accountId = searchParams.get("account") || undefined;
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  // Receipt or invoice, chosen first. Kept in the URL (pushed, not replaced)
  // so the back arrow from the capture step returns to the choice.
  const requestedType = searchParams.get("type");
  const type = ["receipt", "invoice"].includes(requestedType) ? requestedType : null;
  const chooseType = (choice) => {
    const next = new URLSearchParams(searchParams);
    next.set("type", choice);
    setSearchParams(next);
  };

  const handleCapture = async ({ base64, mimeType }) => {
    setBusy(true);
    try {
      const id = await Meteor.callAsync("expenses.create", base64, mimeType, accountId, type);
      const query = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
      // Replace so history-back from the detail page skips the capture view
      // (going "back" to it would start a new expense).
      navigate(`/expenses/${id}${query}`, { replace: true });
    } catch (err) {
      console.error("Error creating expense:", err);
      alert(err.reason || err.message);
      setBusy(false);
    }
  };

  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      <NewExpense type={type} busy={busy} onChooseType={chooseType} onCapture={handleCapture} />
    </Layout>
  );
};

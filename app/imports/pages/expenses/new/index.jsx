import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "/imports/components/Layout/Layout";
import MainContent from "/imports/components/MainContent";
import ReceiptCapture from "../components/ReceiptCapture";
import { safeReturnTo } from "../utils";

export default () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useTracker(() => Meteor.user());
  const [busy, setBusy] = useState(false);
  // Started from a group's expense account page: preselect it and carry the
  // page to return to once the expense is finished.
  const accountId = searchParams.get("account") || undefined;
  const returnTo = safeReturnTo(searchParams.get("returnTo"));

  const handleCapture = async ({ base64, mimeType }) => {
    setBusy(true);
    try {
      const id = await Meteor.callAsync("expenses.create", base64, mimeType, accountId);
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
      <MainContent>
        <h2 className="text-2xl mb-3">{t("expenseNew")}</h2>
        <p className="text-gray-600 mb-6">{t("expenseNewIntro")}</p>
        <ReceiptCapture onCapture={handleCapture} busy={busy} />
      </MainContent>
    </Layout>
  );
};

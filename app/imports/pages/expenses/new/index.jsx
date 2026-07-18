import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "/imports/components/Layout/Layout";
import MainContent from "/imports/components/MainContent";
import ReceiptCapture from "../components/ReceiptCapture";

export default () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useTracker(() => Meteor.user());
  const [busy, setBusy] = useState(false);

  const handleCapture = async ({ base64, mimeType }) => {
    setBusy(true);
    try {
      const id = await Meteor.callAsync("expenses.create", base64, mimeType);
      // Replace so history-back from the detail page skips the capture view
      // (going "back" to it would start a new expense).
      navigate(`/expenses/${id}`, { replace: true });
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

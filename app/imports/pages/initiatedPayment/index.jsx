import React, { useState, useEffect, useCallback, useRef, useContext } from "react";
import { Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "/imports/components/Layout/Layout";
import InitiatedPayment from "./InitiatedPayment";
import { MemberInfoContext } from "/imports/context/MemberInfoContext";

const POLL_INTERVAL = 2000; // 2 seconds
const TIMEOUT_MS = 180000; // 3 minutes

export default function InitiatedPaymentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { externalId } = useParams();
  const location = useLocation();
  const { memberInfo, refetch } = useContext(MemberInfoContext);
  const awaitingApproval =
    !memberInfo?.member?.registered || !memberInfo?.liabilityDate;

  // Get qrCode from navigation state if provided
  const initialQrCode = location.state?.qrCode || null;

  const [step, setStep] = useState("processing");
  const [qrCode] = useState(initialQrCode);
  const [error, setError] = useState(null);
  // What the payment is for: a membership, or an item of the webshop. Known
  // from the first answer, so the waiting view can say it too.
  const [purchase, setPurchase] = useState(null);

  const pollIntervalRef = useRef(null);
  const timeoutRef = useRef(null);

  const clearTimeouts = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };
  // Cleanup polling on unmount
  useEffect(() => clearTimeouts, []);

  // Start polling for payment status on mount
  useEffect(() => {
    if (!externalId) return;

    timeoutRef.current = setTimeout(() => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setError("timeout");
      setStep("error");
    }, TIMEOUT_MS);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const result = await Meteor.callAsync("payment.getStatus", externalId);
        if (result.kind === "storeItem") {
          setPurchase((known) => known || { item: result.item, amount: result.amount, comment: result.comment });
        }

        if (result.status === "PAID") {
          clearTimeouts();
          setStep("success");
          refetch();
        } else if (
          result.status === "ERROR" ||
          result.status === "CANCELLED" ||
          result.status === "DECLINED"
        ) {
          clearTimeouts();
          setError(result.error || result.status);
          setStep("error");
        }
      } catch (err) {
        console.error("Error polling payment status:", err);
      }
    }, POLL_INTERVAL);

    return clearTimeouts;
  }, [externalId]);

  // Retry or cancel: back to what was being paid for, the item or the memberships.
  const backTo = purchase
    ? (purchase.item?.available ? `/store/${purchase.item.code}` : "/store")
    : "/membership";
  const handleRetry = useCallback(() => {
    clearTimeouts();
    navigate(backTo);
  }, [navigate, backTo]);
  const handleCancel = handleRetry;

  const handlePurchases = useCallback(() => {
    navigate("/purchases");
  }, [navigate]);

  // Handle back to start after success
  const handleBackToStart = useCallback(() => {
    navigate("/");
  }, [navigate]);

  // Redirect if not logged in
  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  // Redirect if no externalId
  if (!externalId) {
    return <Navigate to="/membership" />;
  }

  return (
    <Layout>
      <InitiatedPayment
        step={step}
        qrCode={qrCode}
        error={error}
        awaitingApproval={awaitingApproval}
        purchase={purchase}
        onPurchases={handlePurchases}
        onRetry={handleRetry}
        onCancel={handleCancel}
        onBackToStart={handleBackToStart}
      />
    </Layout>
  );
}

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TopBar from "/imports/components/TopBar";
import BottomNavigation from "/imports/components/BottomNavigation";
import InitiatedPayment from "./InitiatedPayment";

const POLL_INTERVAL = 2000; // 2 seconds
const TIMEOUT_MS = 180000; // 3 minutes

export default function InitiatedPaymentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { externalId } = useParams();
  const location = useLocation();

  // Get qrCode from navigation state if provided
  const initialQrCode = location.state?.qrCode || null;

  const [step, setStep] = useState("processing");
  const [qrCode] = useState(initialQrCode);
  const [error, setError] = useState(null);

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

        if (result.status === "PAID") {
          clearTimeouts();
          setStep("success");
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

  // Handle retry - go back to membership selection
  const handleRetry = useCallback(() => {
    clearTimeouts();
    navigate("/membership");
  }, [navigate]);

  // Handle cancel / back
  const handleCancel = useCallback(() => {
    clearTimeouts();
    navigate("/membership");
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
    <>
      <TopBar />
      <div className="login-form">
        <InitiatedPayment
          step={step}
          qrCode={qrCode}
          error={error}
          onRetry={handleRetry}
          onCancel={handleCancel}
          onBackToStart={handleBackToStart}
        />
      </div>
      <BottomNavigation />
    </>
  );
}

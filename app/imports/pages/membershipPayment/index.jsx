import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTracker } from "meteor/react-meteor-data";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TopBar from "/imports/components/TopBar";
import BottomNavigation from "/imports/components/BottomNavigation";
import MembershipPayment from "./MembershipPayment";

const POLL_INTERVAL = 2000; // 2 seconds
const TIMEOUT_MS = 180000; // 3 minutes

export default function MembershipPaymentPage() {
  const { t } = useTranslation();
  const user = useTracker(() => Meteor.user());
  const navigate = useNavigate();
  const { paymentType } = useParams();

  const [paymentOption, setPaymentOption] = useState(null);
  const [step, setStep] = useState("method");
  const [qrCode, setQrCode] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [externalId, setExternalId] = useState(null);

  const pollIntervalRef = useRef(null);
  const timeoutRef = useRef(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Load payment option from config
  useEffect(() => {
    fetch("/data/paymentOptions.json")
      .then((res) => res.json())
      .then((data) => {
        const option = data.options?.find((o) => o.paymentType === paymentType);
        if (option) {
          setPaymentOption(option);
        } else {
          setError("Invalid payment type");
          setStep("error");
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load payment options config:", err);
        setError("Failed to load payment options");
        setStep("error");
        setIsLoading(false);
      });
  }, [paymentType]);

  // Start polling for payment status
  const startPolling = useCallback((extId) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setError("timeout");
      setStep("error");
    }, TIMEOUT_MS);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const result = await Meteor.callAsync("payment.getStatus", extId);

        if (result.status === "PAID") {
          clearInterval(pollIntervalRef.current);
          clearTimeout(timeoutRef.current);
          setStep("success");
        } else if (
          result.status === "ERROR" ||
          result.status === "CANCELLED" ||
          result.status === "DECLINED"
        ) {
          clearInterval(pollIntervalRef.current);
          clearTimeout(timeoutRef.current);
          setError(result.error || result.status);
          setStep("error");
        }
      } catch (err) {
        console.error("Error polling payment status:", err);
      }
    }, POLL_INTERVAL);
  }, []);

  // Handle payment method selection
  const handleSelectMethod = useCallback(
    async (method) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await Meteor.callAsync("payment.initiate", paymentType);
        setExternalId(result.externalId);

        if (method === "qr") {
          const qrCodeData = await Meteor.callAsync(
            "payment.getQrCode",
            result.paymentrequesttoken
          );
          setQrCode(qrCodeData);
          setStep("processing");
          startPolling(result.externalId);
        } else {
          setStep("processing");
          startPolling(result.externalId);
          window.location.href = result.deepLink;
        }
      } catch (err) {
        console.error("Error initiating payment:", err);
        setError(err.reason || err.message);
        setStep("error");
      } finally {
        setIsLoading(false);
      }
    },
    [paymentType, startPolling]
  );

  // Handle retry
  const handleRetry = useCallback(() => {
    setStep("method");
    setQrCode(null);
    setError(null);
    setExternalId(null);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  // Handle cancel / back
  const handleCancel = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
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

  // Loading state while fetching config
  if (isLoading && !paymentOption) {
    return (
      <>
        <TopBar />
        <div className="login-form">
          <div className="flex flex-col gap-4 items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
            <span>{t("loading")}</span>
          </div>
        </div>
        <BottomNavigation />
      </>
    );
  }

  return (
    <>
      <TopBar />
      <div className="login-form">
        <MembershipPayment
          paymentOption={paymentOption}
          step={step}
          qrCode={qrCode}
          error={error}
          isLoading={isLoading}
          onSelectMethod={handleSelectMethod}
          onRetry={handleRetry}
          onCancel={handleCancel}
          onBackToStart={handleBackToStart}
        />
      </div>
      <BottomNavigation />
    </>
  );
}

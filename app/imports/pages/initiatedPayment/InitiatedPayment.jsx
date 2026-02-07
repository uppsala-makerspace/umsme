import React from "react";
import { useTranslation } from "react-i18next";
import Button from "../../components/Button";

/**
 * Pure presentation component for initiated payment status.
 *
 * @param {Object} props
 * @param {string} props.step - Current step: 'processing' | 'success' | 'error'
 * @param {string|null} props.qrCode - QR code data URL
 * @param {string|null} props.error - Error message
 * @param {function} props.onRetry - Callback to retry after error
 * @param {function} props.onCancel - Callback to cancel
 * @param {function} props.onBackToStart - Callback to go back to home
 */
export default function InitiatedPayment({
  step = "processing",
  qrCode = null,
  error = null,
  onRetry,
  onCancel,
  onBackToStart,
}) {
  const { t } = useTranslation();

  // Processing / waiting for payment step
  if (step === "processing") {
    return (
      <div className="flex flex-col gap-4 items-center">
        <h3 className="text-h3">{t("waitingForPayment")}</h3>

        {qrCode ? (
          <>
            <p className="text-container">{t("ScanQrCode")}</p>
            <img
              src={qrCode}
              alt="Swish QR Code"
              className="w-64 h-64 border rounded-lg"
            />
          </>
        ) : (
          <p className="text-container">{t("FinishPayment")}</p>
        )}

        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          <span>{t("loading")}</span>
        </div>

        <Button variant="secondary" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    );
  }

  // Success step
  if (step === "success") {
    return (
      <div className="flex flex-col gap-4 items-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-h3">{t("paymentApproved")}</h3>
        <p className="text-container">{t("ThankPayment")}</p>
        <p className="text-container">{t("MembershipRegistered")}</p>

        <Button onClick={onBackToStart}>
          {t("BackToStart")}
        </Button>
      </div>
    );
  }

  // Error step
  if (step === "error") {
    const isTimeout = error === "timeout";
    return (
      <div className="flex flex-col gap-4 items-center">
        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h3 className="text-h3">
          {isTimeout ? t("paymentTimeout") : t("paymentFailed")}
        </h3>
        <p className="text-container">
          {isTimeout ? t("paymentTimeoutDescription") : error || t("SomethingWentWrong")}
        </p>

        <Button onClick={onRetry}>
          {t("tryAgain")}
        </Button>

        <Button variant="secondary" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    );
  }

  // Fallback loading state
  return (
    <div className="flex flex-col gap-4 items-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
      <span>{t("loading")}</span>
    </div>
  );
}

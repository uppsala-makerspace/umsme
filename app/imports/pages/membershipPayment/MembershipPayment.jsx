import React from "react";
import { useTranslation } from "react-i18next";

/**
 * Pure presentation component for membership payment.
 *
 * @param {Object} props
 * @param {Object} props.paymentOption - The selected payment option from config
 * @param {string} props.step - Current step: 'method' | 'processing' | 'success' | 'error'
 * @param {string|null} props.qrCode - QR code data URL
 * @param {string|null} props.error - Error message
 * @param {boolean} props.isLoading - Whether something is loading
 * @param {function} props.onSelectMethod - Callback when user selects method ('qr' or 'deeplink')
 * @param {function} props.onRetry - Callback to retry after error
 * @param {function} props.onCancel - Callback to cancel
 * @param {function} props.onBackToStart - Callback to go back to home
 */
export default function MembershipPayment({
  paymentOption,
  step = "method",
  qrCode = null,
  error = null,
  isLoading = false,
  onSelectMethod,
  onRetry,
  onCancel,
  onBackToStart,
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "sv" ? "sv" : "en";

  // Helper to get localized text
  const getLabel = (option) =>
    option?.label?.[lang] || option?.label?.en || option?.paymentType || "";

  // Select payment method step
  if (step === "method") {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="text-h3">{t("payWithSwish")}</h3>

        <div className="flex flex-col gap-2 p-4 bg-gray-100 rounded-lg">
          <span className="font-semibold">{getLabel(paymentOption)}</span>
          <span>{paymentOption?.amount} kr</span>
        </div>

        <button
          className="form-button"
          onClick={() => onSelectMethod?.("deeplink")}
          disabled={isLoading}
        >
          {t("SwishOnThisDevice")}
        </button>

        <button
          className="form-button white"
          onClick={() => onSelectMethod?.("qr")}
          disabled={isLoading}
        >
          {t("SwishOnOtherDevice")}
        </button>

        <button className="form-button white" onClick={onCancel}>
          {t("cancel")}
        </button>
      </div>
    );
  }

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

        <button className="form-button white" onClick={onCancel}>
          {t("cancel")}
        </button>
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

        <button className="form-button" onClick={onBackToStart}>
          {t("BackToStart")}
        </button>
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

        <button className="form-button" onClick={onRetry}>
          {t("tryAgain")}
        </button>

        <button className="form-button white" onClick={onCancel}>
          {t("cancel")}
        </button>
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

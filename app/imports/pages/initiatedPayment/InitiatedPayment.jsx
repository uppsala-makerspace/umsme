import React from "react";
import { useTranslation } from "react-i18next";
import Button from "../../components/Button";
import MainContent from "../../components/MainContent";
import Loader from "../../components/Loader";
import { localized } from "/imports/common/lib/groupRules";

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
 * @param {{ item: { name, imageUrl }|null, amount, comment }|null} props.purchase -
 *   Set when the payment is for an item of the webshop: what is shown is then
 *   the item, not the membership.
 * @param {function} props.onPurchases - Callback to go to My purchases, after a purchase
 */
export default function InitiatedPayment({
  step = "processing",
  qrCode = null,
  error = null,
  awaitingApproval = false,
  purchase = null,
  onRetry,
  onCancel,
  onBackToStart,
  onPurchases,
}) {
  const { t, i18n } = useTranslation();
  const itemName = purchase ? (localized(purchase.item?.name, i18n.language || "sv") || t("storePurchase")) : null;

  // Processing / waiting for payment step
  if (step === "processing") {
    return (
      <MainContent>
      <div className="flex flex-col gap-4 items-center">
        <h3 className="text-center">{t("waitingForPayment")}</h3>
        {purchase && (
          <p className="text-center m-0">{t("paymentFor", { item: itemName, amount: purchase.amount })}</p>
        )}

        {qrCode ? (
          <>
            <p className="flex flex-col items-center text-center mt-5 mb-4">{t("ScanQrCode")}</p>
            <img
              src={qrCode}
              alt="Swish QR Code"
              className="w-64 h-64 border rounded-lg"
            />
          </>
        ) : (
          <p className="flex flex-col items-center text-center mt-5 mb-4">{t("FinishPayment")}</p>
        )}

        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          <span>{t("loading")}</span>
        </div>

        <Button variant="secondary" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
      </MainContent>
    );
  }

  // Success step
  if (step === "success") {
    return (
      <MainContent>
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
        <h3 className="text-center">{t("paymentApproved")}</h3>
        {purchase ? (
          <>
            {purchase.item?.imageUrl && (
              <img src={purchase.item.imageUrl} alt="" className="w-32 h-32 object-cover rounded-lg" />
            )}
            <p className="text-center mt-2 mb-0">{t("purchaseApproved", { item: itemName, amount: purchase.amount })}</p>
            {purchase.comment && (
              <p className="text-center text-gray-600 mt-0 mb-2">{t("purchaseComment", { comment: purchase.comment })}</p>
            )}
            <Button onClick={onPurchases}>
              {t("storeMyPurchases")}
            </Button>
            <Button variant="secondary" onClick={onBackToStart}>
              {t("BackToStart")}
            </Button>
          </>
        ) : (
          <>
            <p className="flex flex-col items-center text-center mt-5 mb-4">{t(awaitingApproval ? "MembershipRegisteredAwaitingApproval" : "MembershipRegistered")}</p>
            <Button onClick={onBackToStart}>
              {t("BackToStart")}
            </Button>
          </>
        )}
      </div>
      </MainContent>
    );
  }

  // Error step
  if (step === "error") {
    const isTimeout = error === "timeout";
    return (
      <MainContent>
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
        <h3 className="text-center">
          {isTimeout ? t("paymentTimeout") : t("paymentFailed")}
        </h3>
        <p className="flex flex-col items-center text-center mt-5 mb-4">
          {isTimeout ? t("paymentTimeoutDescription") : error || t("SomethingWentWrong")}
        </p>

        <Button onClick={onRetry}>
          {t("tryAgain")}
        </Button>

        <Button variant="secondary" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
      </MainContent>
    );
  }

  // Fallback loading state
  return (
    <MainContent>
      <Loader />
    </MainContent>
  );
}

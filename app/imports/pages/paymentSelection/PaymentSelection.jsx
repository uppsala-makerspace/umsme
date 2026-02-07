import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { marked } from "marked";
import Button from "../../components/Button";

/**
 * Pure presentation component for payment method selection.
 *
 * @param {Object} props
 * @param {Object} props.paymentOption - The selected payment option from config
 * @param {Object} props.membershipDates - Calculated membership dates { memberend, labend }
 * @param {string} props.termsContent - Markdown content for terms of purchase
 * @param {boolean} props.isLoading - Whether something is loading
 * @param {string} props.disabledMessage - Message to show when payments are disabled
 * @param {function} props.onPay - Callback when user clicks pay with selected method ('deeplink' or 'qr')
 * @param {function} props.onCancel - Callback to cancel
 */
export default function PaymentSelection({
  paymentOption,
  membershipDates,
  termsContent,
  isLoading = false,
  disabledMessage,
  onPay,
  onCancel,
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "sv" ? "sv" : "en";
  const [selectedMethod, setSelectedMethod] = useState("deeplink");
  const [showTermsDialog, setShowTermsDialog] = useState(false);

  // Helper to get localized text
  const getLabel = (option) =>
    option?.label?.[lang] || option?.label?.en || option?.paymentType || "";

  // Format date for display
  const formatDate = (date) => {
    if (!date) return null;
    return date.toLocaleDateString(lang === "sv" ? "sv-SE" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {disabledMessage && (
        <div className="p-4 bg-yellow-100 border border-yellow-400 rounded-lg text-yellow-800">
          {disabledMessage}
        </div>
      )}

      <div className="flex flex-col gap-2 p-4 bg-white rounded-lg border border-gray-200">
        <span className="font-semibold">{getLabel(paymentOption)}</span>
        <span>{paymentOption?.amount} kr</span>
        {membershipDates && (
          <div className="text-sm text-gray-600 mt-2 border-t border-gray-200 pt-2">
            {membershipDates.start && (
              <div>
                {t("membershipStartDate")}: {formatDate(membershipDates.start)}
              </div>
            )}
            {membershipDates.memberend && (
              <div>
                {t("membershipValidUntil")}: {formatDate(membershipDates.memberend)}
              </div>
            )}
            {membershipDates.labend && (
              <div>
                {t("labAccessValidUntil")}: {formatDate(membershipDates.labend)}
              </div>
            )}
          </div>
        )}
        {termsContent && (
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={() => setShowTermsDialog(true)}
              className="text-sm px-3 py-1 border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100"
            >
              {t("termsOfPurchase")}
            </button>
          </div>
        )}
      </div>

      <h3 className="text-h3">{t("selectPaymentMethod")}</h3>

      <div className="flex flex-col gap-2 pl-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="paymentMethod"
            value="deeplink"
            checked={selectedMethod === "deeplink"}
            onChange={() => setSelectedMethod("deeplink")}
          />
          <span>{t("SwishOnThisDevice")}</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="paymentMethod"
            value="qr"
            checked={selectedMethod === "qr"}
            onChange={() => setSelectedMethod("qr")}
          />
          <span>{t("SwishOnOtherDevice")}</span>
        </label>
      </div>

      <Button
        fullWidth
        onClick={() => onPay?.(selectedMethod)}
        disabled={isLoading || !!disabledMessage}
      >
        {t("Pay")}
      </Button>

      <Button variant="secondary" fullWidth onClick={onCancel}>
        {t("cancel")}
      </Button>

      {/* Terms of Purchase Dialog */}
      {showTermsDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-16 pb-24"
          onClick={() => setShowTermsDialog(false)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <h2 className="text-lg font-semibold">{t("termsOfPurchase")}</h2>
              <button
                onClick={() => setShowTermsDialog(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none !w-auto !m-0 !p-0"
              >
                &times;
              </button>
            </div>
            <div
              className="p-4 overflow-y-auto terms-content"
              dangerouslySetInnerHTML={{ __html: marked(termsContent || "") }}
            />
            <div className="p-4 border-t">
              <Button
                onClick={() => setShowTermsDialog(false)}
                fullWidth
              >
                {t("close")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

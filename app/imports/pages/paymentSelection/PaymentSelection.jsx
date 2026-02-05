import React, { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Pure presentation component for payment method selection.
 *
 * @param {Object} props
 * @param {Object} props.paymentOption - The selected payment option from config
 * @param {Object} props.membershipDates - Calculated membership dates { memberend, labend }
 * @param {boolean} props.isLoading - Whether something is loading
 * @param {string} props.disabledMessage - Message to show when payments are disabled
 * @param {function} props.onPay - Callback when user clicks pay with selected method ('deeplink' or 'qr')
 * @param {function} props.onCancel - Callback to cancel
 */
export default function PaymentSelection({
  paymentOption,
  membershipDates,
  isLoading = false,
  disabledMessage,
  onPay,
  onCancel,
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "sv" ? "sv" : "en";
  const [selectedMethod, setSelectedMethod] = useState("deeplink");

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
      <h3 className="text-h3">{t("selectPaymentMethod")}</h3>

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
      </div>

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

      <button
        className="form-button"
        onClick={() => onPay?.(selectedMethod)}
        disabled={isLoading || !!disabledMessage}
      >
        {t("Pay")}
      </button>

      <button className="form-button white" onClick={onCancel}>
        {t("cancel")}
      </button>
    </div>
  );
}

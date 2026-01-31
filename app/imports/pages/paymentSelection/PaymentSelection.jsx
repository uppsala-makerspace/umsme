import React, { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Pure presentation component for payment method selection.
 *
 * @param {Object} props
 * @param {Object} props.paymentOption - The selected payment option from config
 * @param {boolean} props.isLoading - Whether something is loading
 * @param {function} props.onPay - Callback when user clicks pay with selected method ('deeplink' or 'qr')
 * @param {function} props.onCancel - Callback to cancel
 */
export default function PaymentSelection({
  paymentOption,
  isLoading = false,
  onPay,
  onCancel,
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "sv" ? "sv" : "en";
  const [selectedMethod, setSelectedMethod] = useState("deeplink");

  // Helper to get localized text
  const getLabel = (option) =>
    option?.label?.[lang] || option?.label?.en || option?.paymentType || "";

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-h3">{t("selectPaymentMethod")}</h3>

      <div className="flex flex-col gap-2 p-4 bg-gray-100 rounded-lg">
        <span className="font-semibold">{getLabel(paymentOption)}</span>
        <span>{paymentOption?.amount} kr</span>
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
        disabled={isLoading}
      >
        {t("Pay")}
      </button>

      <button className="form-button white" onClick={onCancel}>
        {t("cancel")}
      </button>
    </div>
  );
}

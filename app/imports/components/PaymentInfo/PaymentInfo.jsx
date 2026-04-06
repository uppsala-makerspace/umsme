import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

const formatDateTime = (date, language) => {
  const locale = language === "sv" ? "sv-SE" : "en-US";
  const d = new Date(date);
  return d.toLocaleDateString(locale) + " " + d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const PaymentInfo = ({ payment, initiatedPayment }) => {
  const { t, i18n } = useTranslation();

  if (!payment) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="border-b-2 border-gray-600">
        <span className="text-gray-600">{t("paymentInfo")}</span>
      </div>
      <div className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">ID</span>
          <span className="font-mono text-xs">{payment._id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">{t("paymentMethod")}</span>
          <span>{payment.type === "swish" ? "Swish" : "Bankgiro"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">{t("paymentAmount")}</span>
          <span>{payment.amount} SEK</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">{t("paymentDate")}</span>
          <span>{formatDateTime(payment.date, i18n.language)}</span>
        </div>
        {payment.name && (
          <div className="flex justify-between">
            <span className="text-gray-600">{t("paymentName")}</span>
            <span>{payment.name}</span>
          </div>
        )}
        {payment.message && (
          <div className="flex justify-between">
            <span className="text-gray-600">{t("paymentMessage")}</span>
            <span className="text-right max-w-[60%]">{payment.message}</span>
          </div>
        )}
      </div>
      {initiatedPayment && (
        <div className="flex flex-col gap-2 mt-2">
          <div className="border-b-2 border-gray-600">
            <span className="text-gray-600">{t("initiatedPaymentInfo")}</span>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{t("paymentStatus")}</span>
              <span>{initiatedPayment.status}</span>
            </div>
            {initiatedPayment.createdAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t("paymentInitiated")}</span>
                <span>{formatDateTime(initiatedPayment.createdAt, i18n.language)}</span>
              </div>
            )}
            {initiatedPayment.resolvedAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t("paymentResolved")}</span>
                <span>{formatDateTime(initiatedPayment.resolvedAt, i18n.language)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

PaymentInfo.propTypes = {
  payment: PropTypes.object,
  initiatedPayment: PropTypes.object,
};

export default PaymentInfo;

import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MainContent from "../../components/MainContent";
import Loader from "../../components/Loader";
import { localized } from "/imports/common/lib/groupRules";

/**
 * The landing page for one webshop purchase — the counterpart to
 * membershipDetail, which a membership payment keeps using.
 */
const PaymentDetail = ({ loading, error, payment, item, memberName }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  if (error || !payment) {
    return (
      <MainContent>
        <p className="text-red-600 text-center p-8">{error || t("storePurchaseNotFound")}</p>
      </MainContent>
    );
  }

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString(lang === "sv" ? "sv-SE" : "en-US") : "";

  const title = item ? localized(item.name, lang) : payment.itemCode || t("storePurchase");

  return (
    <MainContent>
      {item?.imageUrl && (
        <img
          src={item.imageUrl}
          alt={title}
          className="w-full max-h-64 object-cover rounded-lg mb-4"
        />
      )}

      <h2 className="text-2xl mb-1">{title}</h2>
      <p className="text-sm text-gray-500 mt-0 mb-4">{t("storePurchase")}</p>

      <div className="flex flex-col gap-2 text-sm text-gray-700">
        <div>
          <span className="font-semibold">{t("paymentAmount")}:</span> {payment.amount} kr
        </div>
        <div>
          <span className="font-semibold">{t("paymentDate")}:</span> {formatDate(payment.date)}
        </div>
        <div>
          <span className="font-semibold">{t("paymentMethod")}:</span> {payment.type}
        </div>
        {memberName && (
          <div>
            <span className="font-semibold">{t("paymentName")}:</span> {memberName}
          </div>
        )}
        {payment.comment && (
          <div>
            <span className="font-semibold">{t("storeComment")}:</span> {payment.comment}
          </div>
        )}
      </div>

      <p className="mt-6">
        <Link to="/store/purchases" className="text-brand-green no-underline hover:underline">
          {t("storeMyPurchases")} &rarr;
        </Link>
      </p>
    </MainContent>
  );
};

PaymentDetail.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  payment: PropTypes.object,
  item: PropTypes.object,
  memberName: PropTypes.string,
};

PaymentDetail.defaultProps = {
  loading: false,
  error: null,
  payment: null,
  item: null,
  memberName: null,
};

export default PaymentDetail;

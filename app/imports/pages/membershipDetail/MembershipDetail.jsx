import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import MainContent from "/imports/components/MainContent";
import PaymentInfo from "/imports/components/PaymentInfo/PaymentInfo";

const formatDate = (date, language) => {
  const locale = language === "sv" ? "sv-SE" : "en-US";
  return new Date(date).toLocaleDateString(locale);
};

const getMembershipTypeLabel = (membership, t) => {
  const { type, discount, family } = membership;

  if (family) {
    switch (type) {
      case "member":
        return t("familyBaseType");
      case "lab":
      case "labandmember":
        return t("familyLabType");
    }
  }

  switch (type) {
    case "member":
      return discount ? t("memberDiscountedBaseType") : t("memberBaseType");
    case "lab":
      return t("memberQuarterlyLabType");
    case "labandmember":
      return discount ? t("memberDiscountedLabType") : t("memberLabType");
    default:
      return type;
  }
};

const MembershipDetail = ({ membership, payment, initiatedPayment }) => {
  const { t, i18n } = useTranslation();

  return (
    <MainContent>
      <div className="flex flex-col gap-4">
        <Link to="/account" className="text-sm text-gray-600 no-underline hover:text-gray-800">
          &larr; {t("back")}
        </Link>

        <div className="flex flex-col gap-2">
          <div className="border-b-2 border-gray-600">
            <span className="text-gray-600">{t("membershipDetails")}</span>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{t("TypeOfMembership")}</span>
              <span className="font-medium">{getMembershipTypeLabel(membership, t)}</span>
            </div>
            {membership.start && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t("membershipStartDate")}</span>
                <span>{formatDate(membership.start, i18n.language)}</span>
              </div>
            )}
            {membership.memberend && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t("MembershipEnd")}</span>
                <span>{formatDate(membership.memberend, i18n.language)}</span>
              </div>
            )}
            {membership.labend && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t("LabEnd")}</span>
                <span>{formatDate(membership.labend, i18n.language)}</span>
              </div>
            )}
            {membership.amount != null && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t("paymentAmount")}</span>
                <span>{membership.amount} SEK</span>
              </div>
            )}
          </div>
        </div>

        <PaymentInfo payment={payment} initiatedPayment={initiatedPayment} />
      </div>
    </MainContent>
  );
};

MembershipDetail.propTypes = {
  membership: PropTypes.object.isRequired,
  payment: PropTypes.object,
  initiatedPayment: PropTypes.object,
};

export default MembershipDetail;

import React from "react";
import moment from "moment";
import { useTranslation } from "react-i18next";

/**
 * Format a date according to the current locale
 * @param {Date} date - The date to format
 * @param {string} language - The i18n language code (e.g., 'sv', 'en')
 * @returns {string} The formatted date string
 */
const formatDate = (date, language) => {
  const locale = language === "sv" ? "sv-SE" : "en-US";
  return new Date(date).toLocaleDateString(locale);
};

/**
 * Get the membership type label based on status and member info
 */
const getMembershipType = (status, member, t) => {
  if (member.family || member.infamily) {
    switch (status.type) {
      case "member":
        return t("familyBaseType");
      case "lab":
      case "labandmember":
        return t("familyLabType");
      default:
        return null;
    }
  } else {
    switch (status.type) {
      case "member":
        return status.discounted
          ? t("memberDiscountedBaseType")
          : t("memberBaseType");
      case "lab":
      case "labandmember":
        if (status.quarterly) {
          return status.discounted
            ? t("memberDiscountedQuarterlyLabType")
            : t("memberQuarterlyLabType");
        }
        return status.discounted
          ? t("memberDiscountedLabType")
          : t("memberLabType");
      case "none":
      default:
        return null;
    }
  }
};

/**
 * Reusable component to display current membership status.
 *
 * @param {Object} props
 * @param {Object} props.member - The member object
 * @param {Object} props.status - The membership status object with type, memberEnd, labEnd, etc.
 * @param {boolean} props.showMemberId - Whether to show member ID (default: true)
 */
export default function MembershipStatus({ member, status, showMemberId = true }) {
  const { t, i18n } = useTranslation();

  if (!member || !status) {
    return null;
  }

  const membershipType = getMembershipType(status, member, t);
  const memberDaysRemaining = status.memberEnd
    ? moment(status.memberEnd).diff(moment.now(), "days")
    : null;
  const labDaysRemaining = status.labEnd
    ? moment(status.labEnd).diff(moment.now(), "days")
    : null;
  const hasLabAccess = status.labEnd && status.type !== "member";

  // Don't show anything if no membership
  if (status.type === "none") {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col text-center gap-1">
        <span className="middle-text text-gray-600">{t("TypeOfMembership")}</span>
        <span>{membershipType}</span>
      </div>
      {showMemberId && (
        <div className="flex flex-col text-center gap-1">
          <span className="middle-text text-gray-600">{t("MembershipID")}</span>
          <span>{member.mid}</span>
        </div>
      )}
      <div className="flex flex-col text-center">
        <span className="text-gray-600">{t("MembershipEnd")}</span>
        <span>
          {status.memberEnd ? formatDate(status.memberEnd, i18n.language) : ""}
        </span>
        {memberDaysRemaining !== null && (
          <span
            className={
              memberDaysRemaining > 14
                ? "text-green-600"
                : "text-red-600 font-bold"
            }
          >
            {memberDaysRemaining} {t("daysRemaining")}
          </span>
        )}
      </div>
      {hasLabAccess && (
        <div className="flex flex-col text-center">
          <span className="text-gray-600">{t("LabEnd")}</span>
          <span>
            {status.labEnd ? formatDate(status.labEnd, i18n.language) : ""}
          </span>
          {labDaysRemaining !== null && (
            <span
              className={
                labDaysRemaining > 14
                  ? "text-green-600"
                  : "text-red-600 font-bold"
              }
            >
              {labDaysRemaining} {t("daysRemaining")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

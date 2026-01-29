import React from "react";
import { useTranslation } from "react-i18next";
import MembershipStatus from "/imports/components/MembershipStatus";

/**
 * Pure presentation component for membership selection.
 *
 * @param {Object} props
 * @param {Object} props.member - The member object
 * @param {Object} props.memberStatus - Current membership status
 * @param {Array} props.options - Available payment options from config
 * @param {boolean} props.isDiscounted - Whether discounted pricing is selected
 * @param {boolean} props.isFamily - Whether family membership is selected
 * @param {boolean} props.familyLocked - Whether family checkbox is locked
 * @param {function} props.onSelectOption - Callback when user selects an option
 * @param {function} props.onDiscountedChange - Callback when discounted checkbox changes
 * @param {function} props.onFamilyChange - Callback when family checkbox changes
 * @param {function} props.onCancel - Callback to cancel
 */
export default function MembershipSelection({
  member,
  memberStatus,
  options = [],
  isDiscounted = false,
  isFamily = false,
  familyLocked = false,
  onSelectOption,
  onDiscountedChange,
  onFamilyChange,
  onCancel,
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "sv" ? "sv" : "en";

  // Helper to get localized text from option config
  const getLabel = (option) =>
    option.label?.[lang] || option.label?.en || option.paymentType;
  const getPeriodLabel = (option) =>
    option.period === "quarter"
      ? lang === "sv"
        ? "/kvartal"
        : "/quarter"
      : lang === "sv"
        ? "/år"
        : "/year";

  // Filter options based on discounted and family checkboxes
  const filteredOptions = options.filter((option) => {
    const optionIsDiscounted = option.discountedOnly || false;
    const optionIsFamily = option.familyOnly || false;

    // If family is checked, only show family options
    if (isFamily) {
      if (!optionIsFamily) return false;
    } else {
      // If family is not checked, hide family options
      if (optionIsFamily) return false;
    }

    // If discounted is checked, only show discounted options
    if (isDiscounted) {
      if (optionIsDiscounted) return true;
      // Hide regular options that have a discounted variant
      const hasDiscountedVariant = options.some(
        (o) => o.paymentType === option.paymentType.replace("member", "memberDiscounted")
      );
      return !hasDiscountedVariant;
    } else {
      // If not discounted, hide discounted options
      if (optionIsDiscounted) return false;
    }

    return true;
  });

  // Find the recommended option: most expensive non-disabled option
  const recommendedOption = filteredOptions
    .filter((opt) => !opt.disabled)
    .reduce((max, opt) => (opt.amount > (max?.amount || 0) ? opt : max), null);

  // Show "Renew membership" if membership is expired or expiring within 14 days
  const isRenewal = (() => {
    if (!memberStatus?.memberEnd) return false;
    const now = new Date();
    const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    return memberStatus.memberEnd < fourteenDaysFromNow;
  })();

  return (
    <div className="flex flex-col gap-4">
      <MembershipStatus member={member} status={memberStatus} />

      <h3 className="text-h3">{t(isRenewal ? "renewMembership" : "selectMembership")}</h3>

      {memberStatus?.type === "none" && (
        <p className="text-container">{t("Membershipstext1")}</p>
      )}

      {/* Membership type checkboxes */}
      <div className="flex flex-col gap-2">
        <label className={`checkbox-option ${familyLocked ? "opacity-50" : ""}`}>
          <input
            type="checkbox"
            checked={isFamily}
            onChange={(e) => onFamilyChange?.(e.target.checked)}
            disabled={familyLocked}
          />
          <div className="checkbox-option-text">
            <span className="checkbox-option-label">{t("FamilyMembership")}</span>
            <span className="checkbox-option-description">
              {familyLocked ? t("familyLockedUntilRenewal") : t("familyMembershipInfo")}
            </span>
          </div>
        </label>

        {!isFamily && (
          <label className="checkbox-option">
            <input
              type="checkbox"
              checked={isDiscounted}
              onChange={(e) => onDiscountedChange?.(e.target.checked)}
            />
            <div className="checkbox-option-text">
              <span className="checkbox-option-label">{t("discountedPrice")}</span>
              <span className="checkbox-option-description">
                {t("discountedPriceInfo")}
              </span>
            </div>
          </label>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {filteredOptions.map((option) => {
          const isDisabled = option.disabled;
          const isRecommended = option.paymentType === recommendedOption?.paymentType;
          return (
            <button
              key={option.paymentType}
              className={`form-button ${isRecommended ? "" : "white"} ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={() => !isDisabled && onSelectOption?.(option)}
              disabled={isDisabled}
            >
              <div className="flex flex-col items-center">
                <span>{getLabel(option)}</span>
                <span className="text-sm opacity-80">
                  {option.amount} kr{getPeriodLabel(option)}
                </span>
                {isDisabled && option.disabledReason && (
                  <span className="text-sm text-red-600">
                    {t(option.disabledReason)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <button className="form-button white" onClick={onCancel}>
        {t("cancel")}
      </button>
    </div>
  );
}

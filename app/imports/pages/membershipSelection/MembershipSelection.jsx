import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import MembershipStatus from "/imports/components/MembershipStatus";
import Button from "../../components/Button";
import MainContent from "../../components/MainContent";
import Loader from "../../components/Loader";

/**
 * Pure presentation component for membership selection.
 *
 * @param {Object} props
 * @param {boolean} props.loading - Whether data is loading
 * @param {string} props.error - Error message to display
 * @param {Object} props.member - The member object
 * @param {Object} props.memberStatus - Current membership status
 * @param {Array} props.options - Available payment options from config
 * @param {boolean} props.isDiscounted - Whether discounted pricing is selected
 * @param {boolean} props.isFamily - Whether family membership is selected
 * @param {boolean} props.familyLocked - Whether family checkbox is locked
 * @param {string} props.disabledMessage - Message to show when payments are disabled
 * @param {function} props.onSelectOption - Callback when user selects an option
 * @param {function} props.onDiscountedChange - Callback when discounted checkbox changes
 * @param {function} props.onFamilyChange - Callback when family checkbox changes
 * @param {function} props.onCancel - Callback to cancel
 */
export default function MembershipSelection({
  loading,
  error,
  member,
  memberStatus,
  options = [],
  isDiscounted = false,
  isFamily = false,
  isFamilyMember = false,
  familyLocked = false,
  disabledMessage,
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

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  if (error) {
    return (
      <MainContent>
        <div className="flex flex-col gap-4 items-center">
          <p className="text-red-500">{error}</p>
          <Button onClick={onCancel}>
            {t("BackToStart")}
          </Button>
        </div>
      </MainContent>
    );
  }

  if (isFamilyMember) {
    return (
      <MainContent>
        <div className="flex flex-col gap-4 items-center text-center">
          <MembershipStatus member={member} status={memberStatus} />
          <p className="text-gray-600">{t("familyRenewalWarning")}</p>
          <p className="text-gray-500 text-sm">{t("familyLeaveHint")}</p>
          <Link to="/account" className="w-full block no-underline text-center">
            <Button fullWidth>{t("goToAccount")}</Button>
          </Link>
        </div>
      </MainContent>
    );
  }

  return (
    <MainContent>
    <div className="flex flex-col gap-4">
      <MembershipStatus member={member} status={memberStatus} />

      {disabledMessage && (
        <div className="p-4 bg-yellow-100 border border-yellow-400 rounded-lg text-yellow-800">
          {disabledMessage}
        </div>
      )}

      <h3 className="text-center">{t(isRenewal ? "renewMembership" : "selectMembership")}</h3>

      {memberStatus?.type === "none" && (
        <p className="flex flex-col items-center text-center mt-5 mb-4">{t("Membershipstext1")}</p>
      )}

      {/* Membership type checkboxes */}
      <div className="flex flex-col gap-2">
        <label className={`flex items-start gap-3 p-3 border border-gray-300 rounded cursor-pointer bg-white hover:border-brand-green ${familyLocked ? "opacity-50" : ""}`}>
          <input
            type="checkbox"
            checked={isFamily}
            onChange={(e) => onFamilyChange?.(e.target.checked)}
            disabled={familyLocked}
            className="w-[18px] h-[18px] mt-0.5 shrink-0 accent-brand-green"
          />
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-sm">{t("FamilyMembership")}</span>
            <span className="text-xs text-gray-500">
              {familyLocked ? t("familyLockedUntilRenewal") : t("familyMembershipInfo")}
            </span>
          </div>
        </label>

        {!isFamily && (
          <label className="flex items-start gap-3 p-3 border border-gray-300 rounded cursor-pointer bg-white hover:border-brand-green">
            <input
              type="checkbox"
              checked={isDiscounted}
              onChange={(e) => onDiscountedChange?.(e.target.checked)}
              className="w-[18px] h-[18px] mt-0.5 shrink-0 accent-brand-green"
            />
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">{t("discountedPrice")}</span>
              <span className="text-xs text-gray-500">
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
            <Button
              key={option.paymentType}
              variant={isRecommended ? "primary" : "secondary"}
              fullWidth
              className={isDisabled ? "opacity-50" : ""}
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
            </Button>
          );
        })}
      </div>

      <Button variant="secondary" fullWidth onClick={onCancel}>
        {t("cancel")}
      </Button>
    </div>
    </MainContent>
  );
}

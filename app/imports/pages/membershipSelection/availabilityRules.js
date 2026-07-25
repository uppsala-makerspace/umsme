import { MEMBERSHIP_RENEWAL_WINDOW_DAYS } from "/imports/common/lib/timeConstants.js";

/**
 * Calculate availability for each membership option based on member status.
 *
 * @param {Array} options - Payment options from config
 * @param {Object} memberStatus - Current membership status from memberStatus()
 * @param {boolean} isFamily - Whether family checkbox is selected (unused, family filtering handled by UI)
 * @returns {Array} Options with disabled and disabledReason fields added
 */
export function calculateOptionAvailability(options, memberStatus, isFamily) {
  const now = new Date();
  const renewalWindowEnd = new Date(now);
  renewalWindowEnd.setDate(renewalWindowEnd.getDate() + MEMBERSHIP_RENEWAL_WINDOW_DAYS);

  const { type, memberEnd, labEnd, quarterly, family, discounted } = memberStatus || {};

  // Determine member category
  const isNewMember = type === "none";
  const isExpiredMember = memberEnd && memberEnd < now;
  const isActiveMember = memberEnd && memberEnd > now;
  const isWithinMemberRenewalWindow =
    isActiveMember && memberEnd <= renewalWindowEnd;
  const isWithinLabRenewalWindow =
    labEnd && labEnd > now && labEnd <= renewalWindowEnd;
  const hasActiveLab = labEnd && labEnd > now;

  // S3: switching to family before the renewal window is an *upgrade* rather
  // than a renewal (see MEMBERSHIP_RULES.md). What may be bought depends on
  // what the member holds today; inside the window it is a normal renewal and
  // these rules don't apply.
  const isFamilyUpgrade = isActiveMember && !isWithinMemberRenewalWindow && !family;
  // S3d: a yearly lab member pays only the price difference, through the
  // dedicated upgrade payment types. Quarterly lab is excluded — those members
  // renew into a full family lab year instead (S3b).
  const isLabToFamilyLab = isFamilyUpgrade && hasActiveLab && !quarterly;
  const upgradePath = discounted ? "discounted" : "regular";

  // Check if labEnd equals memberEnd (Q4 scenario)
  const labEndEqualsMemberEnd =
    labEnd &&
    memberEnd &&
    labEnd.getTime &&
    memberEnd.getTime &&
    labEnd.getTime() === memberEnd.getTime();

  return options.map((option) => {
    const result = { ...option, disabled: false, disabledReason: null };
    const isQuarterlyLab = option.paymentType === "memberQuarterlyLab";

    // === Family upgrade products (S3d) ===
    // These exist only to top up an active lab membership to family, and only
    // at the price matching what the member paid last time. In every other
    // situation they are hidden rather than disabled — they are not a choice
    // the member could make, just a variant of the family lab option.
    if (option.upgradePath) {
      if (!isLabToFamilyLab || option.upgradePath !== upgradePath) {
        result.hidden = true;
      } else {
        result.note = "upgradeToFamily";
      }
      return result;
    }

    // === Quarterly Lab Rules ===
    if (isQuarterlyLab) {
      // Not available for new/expired members (no base membership)
      if (isNewMember || isExpiredMember) {
        result.disabled = true;
        result.disabledReason = "disabledNoBaseMembership";
        return result;
      }

      // Available if type='member' (has base only) OR quarterly=true
      const canBuyQuarterly = type === "member" || quarterly === true;
      if (!canBuyQuarterly) {
        // Has yearly lab (type='labandmember' and quarterly=false)
        result.disabled = true;
        result.disabledReason = "disabledHasYearlyLab";
        return result;
      }

      // Q4 scenario: quarterly=true AND labEnd === memberEnd
      // Prevents stacking quarterly without extending base
      if (quarterly && labEndEqualsMemberEnd) {
        result.disabled = true;
        result.disabledReason = "disabledRenewYearlyFirst";
        return result;
      }

      // If has quarterly lab, check if within renewal window before labEnd
      if (quarterly && labEnd && labEnd > now && !isWithinLabRenewalWindow) {
        result.disabled = true;
        result.disabledReason = "disabledTooEarlyToRenew";
        return result;
      }

      // Quarterly is available
      return result;
    }

    // === Yearly Options Rules ===

    // New/expired members can pick any yearly option
    if (isNewMember || isExpiredMember) {
      return result;
    }

    // === Family upgrade (S3a/S3b/S3c) ===
    // Checked before the S1 rule below so a base member upgrading to familyLab
    // gets the family note (and the family terms on the server).
    if (isFamilyUpgrade && option.familyOnly) {
      if (option.paymentType === "familyLab") {
        // A yearly lab member buys the cheaper difference-only product instead.
        if (isLabToFamilyLab) {
          result.hidden = true;
        } else {
          result.note = "upgradeToFamily";
        }
        return result;
      }
      // S3c: familyBase would mean giving up an active lab early — only
      // allowed as an ordinary renewal, inside the window.
      if (hasActiveLab) {
        result.disabled = true;
        result.disabledReason = "disabledFamilyBaseWithLab";
        return result;
      }
      result.note = "upgradeToFamily";
      return result;
    }

    // S1: upgrade to lab. A member with an active base and no active lab can
    // upgrade any time (type === "member"). A member with an active *quarterly*
    // lab may also upgrade once within the lab renewal window — the same window
    // that gates renewing the quarter, so renew and upgrade appear together.
    const isYearlyLabUpgrade =
      option.paymentType === "memberLab" ||
      option.paymentType === "memberDiscountedLab" ||
      option.paymentType === "familyLab";
    if (isYearlyLabUpgrade && (type === "member" || (quarterly && isWithinLabRenewalWindow))) {
      result.note = "upgradeToLab";
      return result;
    }

    // Active members outside the renewal window cannot renew yet
    if (isActiveMember && !isWithinMemberRenewalWindow) {
      result.disabled = true;
      result.disabledReason = "disabledTooEarlyToRenew";
      return result;
    }

    // Within renewal window - option is enabled
    return result;
  });
}

/**
 * Calculate initial checkbox states based on member status.
 *
 * @param {Object} memberStatus - Current membership status
 * @returns {Object} { isFamily, isDiscounted, familyLocked }
 */
export function getInitialCheckboxState(memberStatus) {
  const now = new Date();
  const renewalWindowEnd = new Date(now);
  renewalWindowEnd.setDate(renewalWindowEnd.getDate() + MEMBERSHIP_RENEWAL_WINDOW_DAYS);

  const { family, discounted, memberEnd, type } = memberStatus || {};

  const isNewMember = type === "none";
  const isExpiredMember = memberEnd && memberEnd < now;
  const isActiveMember = memberEnd && memberEnd > now;
  const isWithinRenewalWindow =
    isActiveMember && memberEnd <= renewalWindowEnd;

  // Family can be checked *in* at any time — switching to family mid-period is
  // an upgrade (S3). Unchecking it is a downgrade that loses paid-for value, so
  // it stays locked outside the renewal window for members who already are
  // family. New/expired members may always change it.
  const familyLocked =
    isActiveMember && !isWithinRenewalWindow && !isNewMember && !isExpiredMember && !!family;

  return {
    isFamily: !!family,
    isDiscounted: !!discounted,
    familyLocked,
  };
}

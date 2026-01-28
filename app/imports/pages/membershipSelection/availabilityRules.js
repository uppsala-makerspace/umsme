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
  const fourteenDaysFromNow = new Date(now);
  fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);

  const { type, memberEnd, labEnd, quarterly, family } = memberStatus || {};

  // Determine member category
  const isNewMember = type === "none";
  const isExpiredMember = memberEnd && memberEnd < now;
  const isActiveMember = memberEnd && memberEnd > now;
  const isWithinMemberRenewalWindow =
    isActiveMember && memberEnd <= fourteenDaysFromNow;
  const isWithinLabRenewalWindow =
    labEnd && labEnd > now && labEnd <= fourteenDaysFromNow;

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

      // If has quarterly lab, check if within 14-day window before labEnd
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

    // Active members outside 14-day window cannot renew yet
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
  const fourteenDaysFromNow = new Date(now);
  fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);

  const { family, discounted, memberEnd, type } = memberStatus || {};

  const isNewMember = type === "none";
  const isExpiredMember = memberEnd && memberEnd < now;
  const isActiveMember = memberEnd && memberEnd > now;
  const isWithinRenewalWindow =
    isActiveMember && memberEnd <= fourteenDaysFromNow;

  // Family checkbox can be changed for new/expired members or within renewal window
  const familyLocked =
    isActiveMember && !isWithinRenewalWindow && !isNewMember && !isExpiredMember;

  return {
    isFamily: !!family,
    isDiscounted: !!discounted,
    familyLocked,
  };
}

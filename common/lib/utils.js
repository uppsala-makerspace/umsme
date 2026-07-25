import { Members } from '/imports/common/collections/members.js';
import { Memberships } from '/imports/common/collections/memberships.js';
import {
  MEMBERSHIP_RENEWAL_WINDOW_DAYS,
  FIRST_TIME_MEMBER_GRACE_DAYS,
  UPGRADE_MONTHS,
  QUARTERLY_LAB_MAX_DAYS,
} from '/imports/common/lib/timeConstants.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Detect start and end dates for the regular and lab memberships for a specific member.
 *
 * @param {member} mb an instance in the Member collection
 * @return {Promise<{
 *   memberStart: date,
 *   memberEnd: date,
 *   labStart: date,
 *   labEnd: date,
 *   family: boolean,
 *   type: string,
 *   discounted: boolean,
 *   quarterly: boolean
 * }>}
 */
export const memberStatus = async (mb) => {
  if (!mb) {
    return {};
  }
  const mid = mb.infamily || mb._id;
  let member;
  let memberStart;
  let lab;
  let labStart;
  let family = false;
  const now = new Date();
  let discounted = false;
  const updateMemberDate = (ms) => {
    if (!member || ms.memberend > member) {
      member = ms.memberend;
      memberStart = ms.start;
      family = ms.family;
      if (ms.memberend > now) {
        discounted = !!ms.discount;
      }
    }
  };
  let labms;
  const updateLabDate = (ms) => {
    if (!lab || ms.labend > lab) {
      lab = ms.labend;
      labStart = ms.start;
      if (ms.labend > now) {
        discounted = !!ms.discount;
        labms = ms;
      }
    }
  };
  await Memberships.find({mid}).forEachAsync((ms) => {
    switch (ms.type) {
      case 'member':
        updateMemberDate(ms);
        break;
      case 'lab':
        updateLabDate(ms);
        // Quarterly lab may extend memberend when labend > memberend
        if (ms.memberend) {
          updateMemberDate(ms);
        }
        break;
      case 'labandmember':
        updateMemberDate(ms);
        updateLabDate(ms);
        break;
    }
  });
  let type = 'none';
  if (member > now && lab > now) {
    type = 'labandmember';
  } else if (lab > now) {
    type = 'lab';
  } else if (member > now) {
    type = 'member';
  }
  // The controlling lab membership is "quarterly" when it is a dedicated
  // quarterly-lab doc (type 'lab'), or a legacy combined "yearly base +
  // quarterly lab" doc (type 'labandmember') whose lab span is short — i.e.
  // a quarter, not a year. Lab spans are only ever ~3 or ~12 months, so the
  // duration cleanly distinguishes them (and isn't fooled by a yearly lab
  // renewed on a different date than the base).
  const labDays = labms && labms.start && labms.labend
    ? (labms.labend.getTime() - labms.start.getTime()) / DAY_MS
    : null;
  const quarterly = !!labms && (
    labms.type === 'lab' ||
    (labDays !== null && labDays < QUARTERLY_LAB_MAX_DAYS)
  );
  return { memberEnd: member, memberStart, labEnd: lab, labStart, family, type, discounted, quarterly};
};

/**
 * The member instance in the member collection contains duplicate information regarding
 * end dates of regular and lab membership. This method synchronizes that information
 * where the instances of the memberships collection are considered the truth.
 *
 * @param {member} mb an instance of the member collection
 * @return {Promise<void>}
 */
export const updateMember = async (mb) => {
  const { memberEnd, labEnd, family } = await memberStatus(mb);
  const $set = { family };
  const $unset = {};
  if (memberEnd) {
    $set.member = memberEnd;
  } else {
    $unset.member = "";
  }
  if (labEnd) {
    $set.lab = labEnd;
  } else {
    $unset.lab = "";
  }
  await Members.updateAsync(mb._id, {$set, $unset});
};

/**
 * Calculate membership parameters from payment type.
 * Returns null if paymentType is not recognized.
 * Returns { error: 'ERROR_CODE' } for error cases.
 *
 * @param {Date} paymentDate - The date of payment
 * @param {string} paymentType - The payment type key
 * @param {Object} member - The member object with current member/lab end dates
 * @returns {Object|null} Membership parameters or null/error
 */
export function membershipFromPayment(paymentDate, paymentType, member, { quarterly = false } = {}) {
  const now = new Date(paymentDate);
  const isFirstTime = member.member == null;
  const hasActiveMembership = member.member && member.member > now;
  const hasActiveLab = member.lab && member.lab > now;
  const isCurrentlyFamily = member.family === true;

  // Check if within the renewal window before memberend
  const renewalWindowStart = member.member ? new Date(member.member) : null;
  if (renewalWindowStart) {
    renewalWindowStart.setDate(renewalWindowStart.getDate() - MEMBERSHIP_RENEWAL_WINDOW_DAYS);
  }
  const isWithinRenewalWindow = !hasActiveMembership ||
    (renewalWindowStart && now >= renewalWindowStart);

  // Check if memberend > now + 2 months
  const twoMonthsFromNow = new Date(now);
  twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
  const memberendMoreThan2MonthsAway = member.member && member.member > twoMonthsFromNow;

  // Determine payment characteristics. toFamilyLab/discountedToFamilyLab are
  // the S3d upgrade products: they top up an existing lab membership to family
  // for the price difference and leave the end dates alone. The two differ
  // only in price (the previous membership's discount decides which one is
  // offered), so the calculation treats them identically.
  const isFamilyLabUpgradePayment =
    paymentType === 'toFamilyLab' || paymentType === 'discountedToFamilyLab';
  const isFamilyPayment = paymentType.startsWith('family') || isFamilyLabUpgradePayment;
  const isDiscountedPayment = paymentType.includes('Discounted');
  const isQuarterlyPayment = paymentType === 'memberQuarterlyLab';
  const isLabPayment = paymentType.includes('Lab');

  // Detect family switching
  const isSwitchingToFamily = !isCurrentlyFamily && isFamilyPayment;
  const isSwitchingFromFamily = isCurrentlyFamily && !isFamilyPayment;

  // Grace period for first-time members only (for certification)
  const graceDays = isFirstTime ? FIRST_TIME_MEMBER_GRACE_DAYS : 0;

  // === ERROR CHECKS ===

  // Q1: First-time member buying quarterly
  if (isFirstTime && isQuarterlyPayment) {
    return { error: 'QUARTERLY_WITHOUT_BASE_MEMBERSHIP' };
  }

  // S3: Regular -> Family. Within the renewal window this is an ordinary
  // renewal that happens to flip the family flag. Earlier than that it is an
  // *upgrade* — allowed, but on upgrade terms (see the payment cases below).
  // The one refused combination is S3c: giving up an active lab to move to
  // familyBase early would mean paying for less than you already have.
  const isFamilyUpgrade =
    isSwitchingToFamily && hasActiveMembership && !isWithinRenewalWindow;
  if (isFamilyUpgrade && hasActiveLab && !isLabPayment) {
    return { error: 'FAMILY_UPGRADE_TOO_EARLY' };
  }

  // The S3d upgrade products only mean anything for a member who has an
  // active, non-family lab membership to top up.
  if (
    isFamilyLabUpgradePayment &&
    (!hasActiveMembership || !hasActiveLab || isCurrentlyFamily)
  ) {
    return { error: 'FAMILY_LAB_UPGRADE_NOT_APPLICABLE' };
  }

  // S4: Family -> Regular outside the renewal window
  if (isSwitchingFromFamily && hasActiveMembership && !isWithinRenewalWindow) {
    return { error: 'FAMILY_DOWNGRADE_TOO_EARLY' };
  }

  // === CALCULATE MEMBERSHIP ===

  let start = null;
  let memberend = null;
  let labend = hasActiveLab ? new Date(member.lab) : null;
  let type = 'member';
  const family = isFamilyPayment;
  const discount = isDiscountedPayment;

  switch (paymentType) {
    // === QUARTERLY LAB (Q2, Q3, Q4) ===
    case 'memberQuarterlyLab':
      type = 'lab';
      if (!hasActiveLab) {
        // Q2: Has membership, no lab -> labend = now + 3 months
        start = new Date(now);
        labend = new Date(now);
        labend.setMonth(labend.getMonth() + 3);
      } else {
        // Q3/Q4: Has active lab -> labend = labend + 3 months
        start = new Date(member.lab);
        labend = new Date(member.lab);
        labend.setMonth(labend.getMonth() + 3);
      }
      // If labend > memberend then memberend = labend
      memberend = member.member ? new Date(member.member) : null;
      if (!memberend || labend > memberend) {
        memberend = new Date(labend);
      }
      break;

    // === BASE MEMBERSHIPS (S2 for lab->base) ===
    case 'memberBase':
    case 'memberDiscountedBase':
    case 'familyBase':
      // S3a: upgrading to familyBase mid-period, on the same terms as the S1
      // lab upgrade — the full family price buys UPGRADE_MONTHS from today
      // rather than extending the old end date. (An active lab never reaches
      // this branch — that is S3c, refused above.)
      if (isFamilyUpgrade) {
        start = new Date(now);
        memberend = new Date(now);
        memberend.setMonth(memberend.getMonth() + UPGRADE_MONTHS);
        break;
      }
      // S2: If has active lab, labend unchanged (kept from initialization)
      // memberend extends from current or now + grace
      if (hasActiveMembership) {
        start = new Date(member.member);
        memberend = new Date(member.member);
        memberend.setFullYear(memberend.getFullYear() + 1);
      } else {
        start = new Date(now);
        memberend = new Date(now);
        memberend.setDate(memberend.getDate() + graceDays);
        memberend.setFullYear(memberend.getFullYear() + 1);
      }
      break;

    // === LAB MEMBERSHIPS (S1 for base->lab) ===
    case 'memberLab':
    case 'memberDiscountedLab':
    case 'familyLab':
      type = 'labandmember';

      // S3b: upgrading to familyLab mid-period, on the same terms as the S1 lab
      // upgrade below. Kept as its own branch so the family upgrade always
      // grants UPGRADE_MONTHS, rather than falling into S1's "memberend is less
      // than 2 months away" sub-case.
      if (isFamilyUpgrade) {
        start = new Date(now);
        memberend = new Date(now);
        memberend.setMonth(memberend.getMonth() + UPGRADE_MONTHS);
        labend = new Date(memberend);
        break;
      }

      // S1: Upgrading to lab — from a base membership with no active lab, or
      // from an active *quarterly* lab (the quarter is replaced by a full year).
      if (hasActiveMembership && (!hasActiveLab || quarterly)) {
        if (memberendMoreThan2MonthsAway) {
          // memberend > now + 2 months: starts today, labend = memberend =
          // now + UPGRADE_MONTHS (the extra 2 months compensates for the
          // membership value given up by upgrading mid-period).
          start = new Date(now);
          memberend = new Date(now);
          memberend.setMonth(memberend.getMonth() + UPGRADE_MONTHS);
          labend = new Date(memberend);
        } else {
          // memberend <= now + 2 months: starts today, labend = memberend =
          // memberend + 1 year
          start = new Date(now);
          memberend = new Date(member.member);
          memberend.setFullYear(memberend.getFullYear() + 1);
          labend = new Date(memberend);
        }
      } else {
        // Standard lab membership (first time or renewal with existing lab)
        if (hasActiveMembership) {
          start = new Date(member.member);
          memberend = new Date(member.member);
          memberend.setFullYear(memberend.getFullYear() + 1);
        } else {
          start = new Date(now);
          memberend = new Date(now);
          memberend.setDate(memberend.getDate() + graceDays);
          memberend.setFullYear(memberend.getFullYear() + 1);
        }

        if (hasActiveLab) {
          start = new Date(member.lab);
          labend = new Date(member.lab);
          labend.setFullYear(labend.getFullYear() + 1);
        } else {
          start = new Date(now);
          labend = new Date(now);
          labend.setDate(labend.getDate() + graceDays);
          labend.setFullYear(labend.getFullYear() + 1);
        }
      }
      break;

    // === FAMILY LAB UPGRADE (S3d) ===
    case 'toFamilyLab':
    case 'discountedToFamilyLab':
      // Tops up an active lab membership to family for the price difference.
      // The period is untouched — only the family flag changes — so the end
      // dates are copied from what the member already has.
      type = 'labandmember';
      start = new Date(now);
      memberend = new Date(member.member);
      labend = new Date(member.lab);
      break;

    default:
      // Unrecognized paymentType
      return null;
  }

  return {
    labend,
    memberend,
    type,
    discount,
    family,
    start
  };
}
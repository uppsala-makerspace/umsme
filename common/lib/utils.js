import { Members } from '/imports/common/collections/members.js';
import { Memberships } from '/imports/common/collections/memberships.js';

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
  const quarterly = labms && labms.type === 'lab';
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
export function membershipFromPayment(paymentDate, paymentType, member) {
  const now = new Date(paymentDate);
  const isFirstTime = member.member == null;
  const hasActiveMembership = member.member && member.member > now;
  const hasActiveLab = member.lab && member.lab > now;
  const isCurrentlyFamily = member.family === true;

  // Check if within 14 days of memberend
  const fourteenDaysBeforeMemberend = member.member ? new Date(member.member) : null;
  if (fourteenDaysBeforeMemberend) {
    fourteenDaysBeforeMemberend.setDate(fourteenDaysBeforeMemberend.getDate() - 14);
  }
  const isWithin14DaysOfMemberend = !hasActiveMembership ||
    (fourteenDaysBeforeMemberend && now >= fourteenDaysBeforeMemberend);

  // Check if memberend > now + 2 months
  const twoMonthsFromNow = new Date(now);
  twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
  const memberendMoreThan2MonthsAway = member.member && member.member > twoMonthsFromNow;

  // Determine payment characteristics
  const isFamilyPayment = paymentType.startsWith('family');
  const isDiscountedPayment = paymentType.includes('Discounted');
  const isQuarterlyPayment = paymentType === 'memberQuarterlyLab';
  const isLabPayment = paymentType.includes('Lab');

  // Detect family switching
  const isSwitchingToFamily = !isCurrentlyFamily && isFamilyPayment;
  const isSwitchingFromFamily = isCurrentlyFamily && !isFamilyPayment;

  // Grace period: 14 days for first-time members only (for certification)
  const graceDays = isFirstTime ? 14 : 0;

  // === ERROR CHECKS ===

  // Q1: First-time member buying quarterly
  if (isFirstTime && isQuarterlyPayment) {
    return { error: 'QUARTERLY_WITHOUT_BASE_MEMBERSHIP' };
  }

  // S3: Regular -> Family more than 14 days before memberend
  if (isSwitchingToFamily && hasActiveMembership && !isWithin14DaysOfMemberend) {
    return { error: 'FAMILY_UPGRADE_TOO_EARLY' };
  }

  // S4: Family -> Regular more than 14 days before memberend
  if (isSwitchingFromFamily && hasActiveMembership && !isWithin14DaysOfMemberend) {
    return { error: 'FAMILY_DOWNGRADE_TOO_EARLY' };
  }

  // === CALCULATE MEMBERSHIP ===

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
        labend = new Date(now);
        labend.setMonth(labend.getMonth() + 3);
      } else {
        // Q3/Q4: Has active lab -> labend = labend + 3 months
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
      // S2: If has active lab, labend unchanged (kept from initialization)
      // memberend extends from current or now + grace
      if (hasActiveMembership) {
        memberend = new Date(member.member);
        memberend.setFullYear(memberend.getFullYear() + 1);
      } else {
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

      // S1: Upgrading from base membership (no current lab) to lab
      if (hasActiveMembership && !hasActiveLab) {
        if (memberendMoreThan2MonthsAway) {
          // memberend > now + 2 months: labend = memberend = now + 14 months
          memberend = new Date(now);
          memberend.setMonth(memberend.getMonth() + 14);
          labend = new Date(memberend);
        } else {
          // memberend <= now + 2 months: labend = memberend = memberend + 1 year
          memberend = new Date(member.member);
          memberend.setFullYear(memberend.getFullYear() + 1);
          labend = new Date(memberend);
        }
      } else {
        // Standard lab membership (first time or renewal with existing lab)
        if (hasActiveMembership) {
          memberend = new Date(member.member);
          memberend.setFullYear(memberend.getFullYear() + 1);
        } else {
          memberend = new Date(now);
          memberend.setDate(memberend.getDate() + graceDays);
          memberend.setFullYear(memberend.getFullYear() + 1);
        }

        if (hasActiveLab) {
          labend = new Date(member.lab);
          labend.setFullYear(labend.getFullYear() + 1);
        } else {
          labend = new Date(now);
          labend.setDate(labend.getDate() + graceDays);
          labend.setFullYear(labend.getFullYear() + 1);
        }
      }
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
  };
}
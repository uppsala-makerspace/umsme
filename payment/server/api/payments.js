/**
 * Payment processing logic shared across payment mechanisms.
 * This module handles payment records, membership creation, and member updates.
 */

import { Payments } from "/imports/common/collections/payments";
import { Members } from "/imports/common/collections/members";
import { Memberships } from "/imports/common/collections/memberships";
import { v4 as uuidv4 } from 'uuid';

/**
 * Add payment record to database.
 * Returns complete payment object including _id.
 *
 * @param {Object} paymentData - Payment data (type, amount, date, etc.)
 * @returns {Promise<Object>} The created payment document with _id
 */
export async function addPayment(paymentData) {
  const hash = uuidv4().replace(/-/g, "").substring(0, 40);
  const doc = {
    ...paymentData,
    hash,
  };

  const id = await Payments.insertAsync(doc);

  return {
    _id: id,
    ...doc,
  };
}

/**
 * Process a successful payment and create membership if applicable.
 * This is the main entry point for payment processing after a payment is confirmed.
 *
 * @param {Object} payment - The payment record (from addPayment)
 * @param {Object} member - The member object
 * @param {string} paymentType - The payment type key (e.g., 'memberBase', 'memberLab')
 * @returns {Promise<Object|null>} Result with membership id, or error, or null if unknown type
 */
export async function processPayment(payment, member, paymentType) {
  const result = membershipFromPayment(
    payment.date,
    paymentType,
    member
  );

  // If paymentType wasn't recognized, don't create membership
  if (!result) {
    return null;
  }

  // Handle error cases - set error on member, don't create membership
  if (result.error) {
    await Members.updateAsync(
      { _id: member._id },
      { $set: { paymentError: result.error } }
    );
    return { error: result.error };
  }

  const doc = {
    mid: member._id,
    pid: payment._id,
    type: result.type,
    family: result.family,
    discount: result.discount,
    labend: result.labend,
    memberend: result.memberend,
    amount: payment.amount,
    start: new Date(),
  };

  const membershipId = await Memberships.insertAsync(doc);

  // Update denormalized fields on member and family members
  await updateMemberDenormalizedFields(member._id, result);

  return {
    id: membershipId,
    mid: doc.mid,
  };
}

/**
 * Update denormalized fields (member, lab, family) on the member object
 * and all family members who have infamily pointing to this member.
 *
 * @param {string} memberId - The primary member's _id
 * @param {Object} result - The membership result with memberend, labend, family, type
 */
async function updateMemberDenormalizedFields(memberId, result) {
  const { memberend, labend, family, type } = result;

  // Build the update object based on membership type
  const updateFields = {
    family: family,
  };

  // Update member date based on type
  // - 'member' type: only memberend
  // - 'lab' type (quarterly): both labend and potentially memberend (if extended)
  // - 'labandmember' type: both memberend and labend
  if (type === 'member' || type === 'labandmember') {
    updateFields.member = memberend;
  }

  if (type === 'lab' || type === 'labandmember') {
    updateFields.lab = labend;
    // For quarterly lab, memberend might have been extended to match labend
    if (type === 'lab' && memberend) {
      updateFields.member = memberend;
    }
  }

  // Clear any previous payment error
  updateFields.paymentError = null;

  // Update the primary member
  await Members.updateAsync(
    { _id: memberId },
    { $set: updateFields }
  );

  // If this is a family membership, also update all family members
  // Family members are those with infamily pointing to this member
  if (family) {
    const familyMemberCount = await Members.find({ infamily: memberId }).countAsync();
    if (familyMemberCount > 0) {
      await Members.updateAsync(
        { infamily: memberId },
        { $set: updateFields },
        { multi: true }
      );
    }
  }
}

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

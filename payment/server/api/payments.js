/**
 * Payment processing logic shared across payment mechanisms.
 * This module handles payment records, membership creation, and member updates.
 */

import { Email } from "meteor/email";
import { Payments } from "/imports/common/collections/payments";
import { Members } from "/imports/common/collections/members";
import { Memberships } from "/imports/common/collections/memberships";
import { Messages } from "/imports/common/collections/messages";
import { membershipFromPayment } from "/imports/common/lib/utils";
import { findBestTemplate, messageData } from "/imports/common/lib/message";
import { isEmailAllowed } from "/imports/common/server/emailGuard";
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
    start: result.start,
  };

  const membershipId = await Memberships.insertAsync(doc);

  // Link payment to the new membership
  await Payments.updateAsync(payment._id, { $set: { membership: membershipId } });

  // Update denormalized fields on member and family members
  await updateMemberDenormalizedFields(member._id, result);

  // Send automatic confirmation email
  await sendConfirmationEmail(member, membershipId, result.type);

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
 * Send automatic confirmation email after membership creation.
 * Fails silently — email errors should not break payment processing.
 */
async function sendConfirmationEmail(member, membershipId, membershipType) {
  try {
    const membertype = member.family ? 'family' : (member.youth ? 'youth' : 'normal');
    const tpl = await findBestTemplate({
      auto: true, type: 'confirmation', membershiptype: membershipType, membertype
    });
    if (!tpl) {
      console.log(`[Email] No auto confirmation template found for ${membershipType}/${membertype}`);
      return;
    }

    const data = await messageData(member._id, tpl._id, membershipId);
    if (!data.to) {
      console.log(`[Email] No email address for member ${member._id}`);
      return;
    }

    if (!isEmailAllowed(data.to)) {
      console.log(`[Email] Confirmation to ${data.to} blocked by whitelist`);
      return;
    }

    const from = Meteor.settings?.noreply || "no-reply@uppsalamakerspace.se";
    await Email.sendAsync({ to: data.to, from, subject: data.subject, text: data.messagetext });
    console.log(`[Email] Confirmation sent to ${data.to}`);

    await Messages.insertAsync({
      template: tpl._id,
      member: member._id,
      membership: membershipId,
      type: 'confirmation',
      to: data.to,
      subject: data.subject,
      senddate: new Date(),
      messagetext: data.messagetext,
    });
  } catch (err) {
    console.error('[Email] Failed to send confirmation:', err);
  }
}

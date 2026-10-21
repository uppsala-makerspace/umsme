import { Meteor } from 'meteor/meteor';
import { Payments } from '/imports/common/collections/payments';
import { Memberships } from '/imports/common/collections/memberships';
import { Members } from '/imports/common/collections/members';
import { initiatedPayments } from '/imports/common/collections/initiatedPayments';
import { membershipFromPayment, startDateFromAmount, detectPotentialLabPayment } from '/imports/common/lib/rules';
import { updateMember } from '/imports/common/lib/utils';
import { recordChange } from '/imports/common/server/auditLog';

/**
 * Filing payments by hand, and the memberships they pay for. A payment
 * belongs to a member, is for a membership or for another purpose, and
 * stays while a membership refers to it. Every change to a membership
 * recomputes its member's dates (updateMember), as the Blaze pages did from
 * the browser.
 */

const payment = async (paymentId) => {
  const doc = await Payments.findOneAsync(paymentId);
  if (!doc) throw new Meteor.Error('not-found', 'No such payment');
  return doc;
};
const membership = async (membershipId) => {
  const doc = await Memberships.findOneAsync(membershipId);
  if (!doc) throw new Meteor.Error('not-found', 'No such membership');
  return doc;
};
const refreshMember = async (memberId) => {
  const member = await Members.findOneAsync(memberId);
  if (member) await updateMember(member);
};
const record = async (userId, collection, action, docId, before, after) =>
  recordChange({ userId, domain: collection, action, docId, before, after });

/** The payment is the member's. Their mobile number comes along if they had none. */
export const assignPaymentMember = async (paymentId, memberId, { userId }) => {
  const before = await payment(paymentId);
  if (before.storeItem) throw new Meteor.Error('purchase', 'A webshop purchase already belongs to its buyer');
  const member = await Members.findOneAsync(memberId);
  if (!member) throw new Meteor.Error('not-found', 'No such member');
  await Payments.updateAsync(paymentId, { $set: { member: memberId } });
  if (before.mobile && !member.mobile) await Members.updateAsync(memberId, { $set: { mobile: before.mobile } });
  await record(userId, 'payments', 'assignMember', paymentId, before, await Payments.findOneAsync(paymentId));
};

/** The payment belongs to no member, nor to the membership it paid for; the membership stays. */
export const unassignPaymentMember = async (paymentId, { userId }) => {
  const before = await payment(paymentId);
  if (before.storeItem) throw new Meteor.Error('purchase', 'A webshop purchase belongs to its buyer');
  await Memberships.updateAsync({ pid: paymentId }, { $unset: { pid: '' } }, { multi: true });
  await Payments.updateAsync(paymentId, { $unset: { member: '', membership: '' } });
  await record(userId, 'payments', 'unassignMember', paymentId, before, await Payments.findOneAsync(paymentId));
};

/** Whether the payment was for something other than membership. */
export const setPaymentOther = async (paymentId, other, { userId }) => {
  const before = await payment(paymentId);
  if (before.storeItem) throw new Meteor.Error('purchase', 'A webshop purchase is classified by its item');
  if (other && before.membership) throw new Meteor.Error('has-membership', 'Disconnect the membership first');
  await Payments.updateAsync(paymentId, other ? { $set: { other: true } } : { $unset: { other: '' } });
  await record(userId, 'payments', other ? 'markOther' : 'unmarkOther', paymentId, before, await Payments.findOneAsync(paymentId));
};

/** Connect the payment to one of its member's memberships that has no payment. */
export const linkPaymentMembership = async (paymentId, membershipId, { userId }) => {
  const before = await payment(paymentId);
  const ms = await membership(membershipId);
  if (!before.member || ms.mid !== before.member) throw new Meteor.Error('other-member', 'The membership is not the payment’s member’s');
  if (ms.pid) throw new Meteor.Error('has-payment', 'The membership already has a payment');
  if (before.other || before.storeItem) throw new Meteor.Error('not-membership', 'The payment is not for a membership');
  await Memberships.updateAsync(membershipId, { $set: { pid: paymentId, updatedAt: new Date() } });
  await Payments.updateAsync(paymentId, { $set: { membership: membershipId } });
  await record(userId, 'payments', 'linkMembership', paymentId, before, await Payments.findOneAsync(paymentId));
};

/** The payment and its membership part; both stay, with the member. */
export const unlinkPaymentMembership = async (paymentId, { userId }) => {
  const before = await payment(paymentId);
  await Memberships.updateAsync({ pid: paymentId }, { $unset: { pid: '' }, $set: { updatedAt: new Date() } }, { multi: true });
  await Payments.updateAsync(paymentId, { $unset: { membership: '' } });
  await record(userId, 'payments', 'unlinkMembership', paymentId, before, await Payments.findOneAsync(paymentId));
};

/** Remove a payment, never one a membership refers to; the initiated payment behind it goes too. */
export const removePayment = async (paymentId, { userId }) => {
  const before = await payment(paymentId);
  if (before.membership || (await Memberships.findOneAsync({ pid: paymentId }))) {
    throw new Meteor.Error('has-membership', 'Cannot delete a payment while it is connected to a membership');
  }
  if (before.initiatedBy) await initiatedPayments.removeAsync(before.initiatedBy);
  await Payments.removeAsync(paymentId);
  await record(userId, 'payments', 'remove', paymentId, before, null);
};

/** What a new membership for a member starts from: the payment's amount, and the start the rules suggest. */
export const suggestMembership = async (memberId, paymentId) => {
  const member = await Members.findOneAsync(memberId);
  if (!member) throw new Meteor.Error('not-found', 'No such member');
  const paid = paymentId ? await payment(paymentId) : null;
  return {
    memberName: member.name,
    amount: paid?.amount ?? null,
    start: paid ? startDateFromAmount(paid.amount, member, detectPotentialLabPayment(member)) : new Date(),
  };
};

/**
 * A membership for a member from its start and amount, the rest worked out
 * by the rules (type, family, discount, end dates), connected to the payment
 * if one is given.
 *
 * @returns {Promise<string>} the membership's id
 */
export const createMembership = async ({ memberId, paymentId, start, amount }, { userId }) => {
  const member = await Members.findOneAsync(memberId);
  if (!member) throw new Meteor.Error('not-found', 'No such member');
  if (paymentId) {
    const paid = await payment(paymentId);
    if (paid.member !== memberId) throw new Meteor.Error('other-member', 'The payment is not the member’s');
    if (paid.membership) throw new Meteor.Error('has-membership', 'The payment already has a membership');
  }
  const computed = membershipFromPayment(start, amount, member.member == null, detectPotentialLabPayment(member));
  const now = new Date();
  const doc = {
    mid: memberId, amount, start, type: computed.type, family: computed.family, discount: computed.discount,
    ...(computed.memberend ? { memberend: computed.memberend } : {}),
    ...(computed.labend ? { labend: computed.labend } : {}),
    ...(paymentId ? { pid: paymentId } : {}),
    updatedAt: now,
  };
  const docId = await Memberships.insertAsync(doc);
  if (paymentId) await Payments.updateAsync(paymentId, { $set: { membership: docId } });
  await refreshMember(memberId);
  await record(userId, 'memberships', 'create', docId, null, doc);
  return docId;
};

const MEMBERSHIP_FIELDS = ['amount', 'start', 'type', 'discount', 'family', 'memberend', 'labend'];

/** Correct a membership by hand, refused with 'conflict' if it changed since `expectedUpdatedAt`. */
export const updateMembership = async (membershipId, fields, { userId, expectedUpdatedAt }) => {
  const before = await membership(membershipId);
  if (expectedUpdatedAt !== undefined && (before.updatedAt?.getTime() ?? null) !== (expectedUpdatedAt?.getTime() ?? null)) {
    throw new Meteor.Error('conflict', 'Someone else changed this membership; reload it and try again');
  }
  const $set = { updatedAt: new Date() };
  const $unset = {};
  for (const field of MEMBERSHIP_FIELDS) {
    if (fields[field] === null || fields[field] === undefined || fields[field] === '') $unset[field] = '';
    else $set[field] = fields[field];
  }
  if ($unset.start || $unset.type || $unset.amount) throw new Meteor.Error('bad-membership', 'A membership needs a start, a type and an amount');
  await Memberships.updateAsync(membershipId, Object.keys($unset).length ? { $set, $unset } : { $set });
  await refreshMember(before.mid);
  await record(userId, 'memberships', 'update', membershipId, before, await Memberships.findOneAsync(membershipId));
};

/** Remove a membership; its payment stays with the member, and the member's dates follow. */
export const removeMembership = async (membershipId, { userId }) => {
  const before = await membership(membershipId);
  if (before.pid) await Payments.updateAsync(before.pid, { $unset: { membership: '' } });
  await Memberships.removeAsync(membershipId);
  await refreshMember(before.mid);
  await record(userId, 'memberships', 'remove', membershipId, before, null);
};

import { randomUUID } from 'crypto';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { Payments } from '/imports/common/collections/payments';
import Invites from '/imports/common/collections/Invites';
import { membershipFromPayment, memberStatus, updateMember } from '/imports/common/lib/utils';

/**
 * Prices per payment type, as in app/private/paymentOptions.json. Payments
 * are seeded with these amounts so that revenue and statistics add up.
 */
export const PRICES = {
  memberBase: 200,
  memberDiscountedBase: 100,
  memberLab: 1600,
  memberDiscountedLab: 1200,
  memberQuarterlyLab: 450,
  familyBase: 300,
  familyLab: 2000,
  toFamilyLab: 400,
  discountedToFamilyLab: 800,
};

/**
 * A member with no memberships yet. Membership dates come from pay(), the
 * way they do in production, never set by hand.
 *
 * `registered` defaults to true: most members have been accepted by the
 * board, and unlocking requires it.
 *
 * @returns {Promise<object>} the inserted member document
 */
export const makeMember = async ({ registered = true, ...fields }) => {
  const doc = { ...fields, ...(registered ? { registered: true } : {}) };
  const _id = await Members.insertAsync(doc);
  return Members.findOneAsync(_id);
};

/**
 * A settled payment and the membership it buys, computed by the same rules
 * the payment app applies (membershipFromPayment), at a chosen date. No mail,
 * push or manager event: those are side effects of a live payment, not part
 * of the data.
 *
 * `via: 'swish'` is a payment made in the app, which carries the Swish
 * reference as externalId; `via: 'bankgiro'` is one that came in through the
 * bank sync, identified by the member id in the message.
 *
 * @param {object} member
 * @param {string} paymentType a key of PRICES
 * @param {{ at?: Date, via?: 'swish'|'bankgiro' }} options
 * @returns {Promise<{ paymentId: string, membershipId: string }>}
 */
export const pay = async (member, paymentType, { at = new Date(), via = 'swish' } = {}) => {
  const current = await Members.findOneAsync(member._id);
  const { quarterly } = await memberStatus(current);
  const result = membershipFromPayment(at, paymentType, current, { quarterly });
  if (!result || result.error) {
    throw new Error(`Seed payment ${paymentType} for ${current.name} at ${at.toISOString()}: ${result?.error || 'unknown payment type'}`);
  }
  const amount = PRICES[paymentType];
  const paymentId = await Payments.insertAsync({
    hash: randomHex(),
    type: via,
    amount,
    date: at,
    name: current.name,
    ...(current.mobile ? { mobile: current.mobile } : {}),
    member: current._id,
    ...(via === 'swish'
      ? { externalId: randomHex(32).toUpperCase(), message: paymentType }
      : { message: current.mid }),
  });
  const membershipId = await Memberships.insertAsync({
    mid: current._id,
    pid: paymentId,
    type: result.type,
    family: result.family,
    discount: result.discount,
    labend: result.labend,
    memberend: result.memberend,
    amount,
    start: result.start,
  });
  await Payments.updateAsync(paymentId, { $set: { membership: membershipId } });
  await syncMemberDates(current._id);
  return { paymentId, membershipId };
};

/**
 * Several payments in date order.
 *
 * @param {object} member
 * @param {Array<{ type: string, at: Date, via?: 'swish'|'bankgiro' }>} payments
 */
export const payHistory = async (member, payments) => {
  const sorted = [...payments].sort((a, b) => a.at - b.at);
  for (const { type, at, via } of sorted) await pay(member, type, { at, via });
};

/**
 * Make `dependent` a family member paid for by `payer`. The membership dates
 * are copied here rather than left to the family cascade hook, so the seed
 * does not depend on which hooks the running app has loaded.
 */
export const joinFamily = async (dependent, payer) => {
  const current = await Members.findOneAsync(payer._id);
  await Members.updateAsync(dependent._id, {
    $set: {
      infamily: current._id,
      ...(current.member ? { member: current.member } : {}),
      ...(current.lab ? { lab: current.lab } : {}),
      family: !!current.family,
    },
  });
  return Members.findOneAsync(dependent._id);
};

/** A pending invitation for `email` to join `payer`'s family. */
export const inviteToFamily = (email, payer) =>
  Invites.insertAsync({ email: email.toLowerCase(), infamily: payer._id });

export const randomHex = (length = 40) => `${randomUUID()}${randomUUID()}`.replace(/-/g, '').substring(0, length);

/** Recompute a payer's denormalized dates and copy them to the family. */
const syncMemberDates = async (memberId) => {
  await updateMember(await Members.findOneAsync(memberId));
  const payer = await Members.findOneAsync(memberId);
  const $set = { family: !!payer.family };
  const $unset = {};
  for (const field of ['member', 'lab']) {
    if (payer[field]) $set[field] = payer[field];
    else $unset[field] = '';
  }
  await Members.updateAsync(
    { infamily: memberId },
    Object.keys($unset).length ? { $set, $unset } : { $set },
    { multi: true },
  );
};

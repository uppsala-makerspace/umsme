import { Meteor } from 'meteor/meteor';
import { Payments } from '/imports/common/collections/payments';
import { Memberships } from '/imports/common/collections/memberships';
import { Members } from '/imports/common/collections/members';
import { StoreItems } from '/imports/common/collections/storeItems';
import { initiatedPayments } from '/imports/common/collections/initiatedPayments';

/**
 * What the payment pages show, worked out on the server: pages of the
 * payment tabs, one payment with what filing it needs, one membership with
 * its payment and the family members it carries.
 */

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const PAYMENT_SORTS = ['date', 'amount', 'type', 'message', 'clarification', 'comment'];

/** The tabs: manual payments (bank sync and typed in), automatic (Swish in the app), membership payments, purchases. */
const TABS = {
  manual: () => ({ externalId: { $exists: false } }),
  automatic: () => ({ externalId: { $exists: true } }),
  memberships: () => ({ membership: { $exists: true } }),
  store: (storeItem) => ({ storeItem: storeItem || { $exists: true } }),
};

const searchSelector = async (search) => {
  const words = (search || '').trim().split(/\s+/).filter(Boolean).slice(0, 5);
  if (!words.length) return null;
  const parts = [];
  for (const word of words) {
    const pattern = new RegExp(escape(word), 'i');
    const members = await Members.find({ name: pattern }, { fields: { _id: 1 }, limit: 200 }).fetchAsync();
    const number = Number(word.replace(',', '.'));
    parts.push({ $or: [
      { message: pattern }, { clarification: pattern }, { name: pattern }, { mobile: pattern }, { type: pattern }, { comment: pattern }, { itemCode: pattern },
      { member: { $in: members.map((m) => m._id) } }, ...(Number.isFinite(number) ? [{ amount: number }] : []),
    ] });
  }
  return { $and: parts };
};

/** How a payment is filed: a purchase, for a membership, for something else, or not yet. */
export const paymentKind = (p) => (p.storeItem ? 'purchase' : p.membership ? 'membership' : p.other ? 'other' : 'untreated');

/**
 * One page of a tab, newest first unless sorted otherwise.
 *
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export const paymentsPage = async ({ tab, storeItem, search, sort, page = 0, pageSize = 50 }) => {
  const base = TABS[tab];
  if (!base) throw new Meteor.Error('bad-tab', `No payment list "${tab}"`);
  if (sort && !PAYMENT_SORTS.includes(sort.field)) throw new Meteor.Error('bad-sort', `Cannot sort by "${sort.field}"`);
  const size = Math.min(Math.max(1, pageSize), 200);
  const found = await searchSelector(search);
  const selector = found ? { $and: [base(storeItem), found] } : base(storeItem);
  const order = { ...(sort ? { [sort.field]: sort.direction === 'desc' ? -1 : 1 } : { date: -1 }), _id: 1 };
  const [payments, total] = await Promise.all([
    Payments.find(selector, { fields: { hash: 0 }, sort: order, skip: Math.max(0, page) * size, limit: size }).fetchAsync(),
    Payments.find(selector).countAsync(),
  ]);
  const names = Object.fromEntries((await Members.find({ _id: { $in: payments.map((p) => p.member).filter(Boolean) } }, { fields: { name: 1 } }).fetchAsync())
    .map((m) => [m._id, m.name]));
  return { rows: payments.map((p) => ({ ...p, memberName: p.member ? names[p.member] || null : null, kind: paymentKind(p) })), total };
};

/** A payment, its member, membership, initiated payment and item, and the memberships it could be connected to. */
export const paymentDetail = async (paymentId) => {
  const payment = await Payments.findOneAsync(paymentId);
  if (!payment) throw new Meteor.Error('not-found', 'No such payment');
  const member = payment.member ? await Members.findOneAsync(payment.member, { fields: { name: 1, mid: 1 } }) : null;
  const membership = await Memberships.findOneAsync({ pid: paymentId });
  return {
    payment: { ...payment, kind: paymentKind(payment) },
    member,
    membership: membership || null,
    initiatedPayment: payment.initiatedBy ? (await initiatedPayments.findOneAsync(payment.initiatedBy)) || null : null,
    storeItem: payment.storeItem ? (await StoreItems.findOneAsync(payment.storeItem, { fields: { name: 1, code: 1 } })) || null : null,
    linkable: member && !membership && !payment.other && !payment.storeItem
      ? await Memberships.find({ mid: member._id, pid: { $exists: false } }, { sort: { start: -1 } }).fetchAsync()
      : [],
  };
};

/** A membership, its member, its payment, and who loses access with it if it stops being a family one. */
export const membershipDetail = async (membershipId) => {
  const membership = await Memberships.findOneAsync(membershipId);
  if (!membership) throw new Meteor.Error('not-found', 'No such membership');
  return {
    membership,
    member: await Members.findOneAsync(membership.mid, { fields: { name: 1, mid: 1 } }),
    payment: membership.pid ? (await Payments.findOneAsync(membership.pid, { fields: { hash: 0 } })) || null : null,
    dependents: (await Members.find({ infamily: membership.mid }, { fields: { name: 1 } }).fetchAsync()).map((m) => m.name),
  };
};

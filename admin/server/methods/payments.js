import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import {
  assignPaymentMember, unassignPaymentMember, setPaymentOther, linkPaymentMembership, unlinkPaymentMembership,
  removePayment, suggestMembership, createMembership, updateMembership, removeMembership,
} from '/imports/common/server/payments/payments';
import { paymentsPage, paymentDetail, membershipDetail } from '../payments/lists';

const roles = DOMAIN_ROLES.payments;
const as = (context) => ({ userId: context.userId });

Meteor.methods({
  async 'payments.page'(options) {
    check(options, {
      tab: String,
      storeItem: Match.Optional(Match.OneOf(null, String)),
      search: Match.Optional(String),
      sort: Match.Optional(Match.OneOf(null, { field: String, direction: Match.OneOf('asc', 'desc') })),
      page: Match.Optional(Match.Integer),
      pageSize: Match.Optional(Match.Integer),
    });
    await requireRole(this.userId, roles);
    return paymentsPage({ ...options, sort: options.sort || undefined, storeItem: options.storeItem || undefined });
  },
  async 'payments.detail'(paymentId) {
    check(paymentId, String);
    await requireRole(this.userId, roles);
    return paymentDetail(paymentId);
  },
  async 'payments.assignMember'(paymentId, memberId) {
    check(paymentId, String);
    check(memberId, String);
    await requireRole(this.userId, roles);
    await assignPaymentMember(paymentId, memberId, as(this));
  },
  async 'payments.unassignMember'(paymentId) {
    check(paymentId, String);
    await requireRole(this.userId, roles);
    await unassignPaymentMember(paymentId, as(this));
  },
  async 'payments.setOther'(paymentId, other) {
    check(paymentId, String);
    check(other, Boolean);
    await requireRole(this.userId, roles);
    await setPaymentOther(paymentId, other, as(this));
  },
  async 'payments.linkMembership'(paymentId, membershipId) {
    check(paymentId, String);
    check(membershipId, String);
    await requireRole(this.userId, roles);
    await linkPaymentMembership(paymentId, membershipId, as(this));
  },
  async 'payments.unlinkMembership'(paymentId) {
    check(paymentId, String);
    await requireRole(this.userId, roles);
    await unlinkPaymentMembership(paymentId, as(this));
  },
  async 'payments.remove'(paymentId) {
    check(paymentId, String);
    await requireRole(this.userId, roles);
    await removePayment(paymentId, as(this));
  },

  async 'memberships.suggest'(memberId, paymentId) {
    check(memberId, String);
    check(paymentId, Match.OneOf(null, String));
    await requireRole(this.userId, roles);
    return suggestMembership(memberId, paymentId);
  },
  async 'memberships.create'(fields) {
    check(fields, { memberId: String, paymentId: Match.OneOf(null, String), start: Date, amount: Number });
    await requireRole(this.userId, roles);
    return createMembership(fields, as(this));
  },
  async 'memberships.detail'(membershipId) {
    check(membershipId, String);
    await requireRole(this.userId, roles);
    return membershipDetail(membershipId);
  },
  async 'memberships.update'(membershipId, fields, expectedUpdatedAt) {
    check(membershipId, String);
    check(fields, {
      amount: Number, start: Date, type: String, discount: Boolean, family: Boolean,
      memberend: Match.OneOf(null, Date), labend: Match.OneOf(null, Date),
    });
    check(expectedUpdatedAt, Match.OneOf(null, Date));
    await requireRole(this.userId, roles);
    await updateMembership(membershipId, fields, { ...as(this), expectedUpdatedAt });
  },
  async 'memberships.remove'(membershipId) {
    check(membershipId, String);
    await requireRole(this.userId, roles);
    await removeMembership(membershipId, as(this));
  },
});

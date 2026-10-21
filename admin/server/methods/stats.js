import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Memberships } from '/imports/common/collections/memberships';
import { Members } from '/imports/common/collections/members';
import { Payments } from '/imports/common/collections/payments';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import { membershipStatistics, memberHistory } from '/imports/stats/memberStats';
import { revenueModel } from '/imports/stats/revenueModel';

/**
 * The statistics pages' figures, worked out here from the whole collections
 * instead of in the browser.
 */

const MEMBERSHIP_FIELDS = { mid: 1, type: 1, family: 1, start: 1, memberend: 1, labend: 1, discount: 1 };

Meteor.methods({
  async 'stats.memberships'(interval) {
    check(interval, Match.OneOf('all', 'year', 'quarter', 'month'));
    await requireRole(this.userId, DOMAIN_ROLES.stats);
    return membershipStatistics(await Memberships.find({}, { fields: MEMBERSHIP_FIELDS }).fetchAsync(), interval);
  },

  async 'stats.history'() {
    await requireRole(this.userId, DOMAIN_ROLES.stats);
    const [memberships, members] = await Promise.all([
      Memberships.find({}, { fields: MEMBERSHIP_FIELDS }).fetchAsync(),
      Members.find({}, { fields: { name: 1, email: 1, member: 1, lab: 1, family: 1, infamily: 1 } }).fetchAsync(),
    ]);
    return memberHistory(memberships, members);
  },

  async 'stats.revenue'() {
    await requireRole(this.userId, DOMAIN_ROLES.stats);
    const [payments, memberships] = await Promise.all([
      Payments.find({}, { fields: { date: 1, amount: 1, membership: 1, other: 1, storeItem: 1 } }).fetchAsync(),
      Memberships.find({}, { fields: { type: 1, family: 1, start: 1, labend: 1 } }).fetchAsync(),
    ]);
    return revenueModel(payments, Object.fromEntries(memberships.map((m) => [m._id, m])));
  },
});

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import { searchMembers, memberNames } from '/imports/common/server/members/search';

/**
 * Looking members up for pickers (a group's responsible, adding a member):
 * the matches and names asked for, rather than every member published.
 */
Meteor.methods({
  async 'adminMembers.search'(query) {
    check(query, String);
    await requireRole(this.userId, DOMAIN_ROLES.memberLookup);
    return searchMembers(query);
  },

  async 'adminMembers.names'(ids) {
    check(ids, [String]);
    await requireRole(this.userId, DOMAIN_ROLES.memberLookup);
    return memberNames(ids);
  },
});

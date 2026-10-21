import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import { searchMembers, memberNames } from '/imports/common/server/members/search';
import { memberListPage } from '/imports/common/server/members/memberList';

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

Meteor.methods({
  /** A page of one of the member lists (all, excluded, reminders, a family's candidates). */
  async 'adminMembers.page'(options) {
    check(options, {
      view: String,
      patronId: Match.Optional(String),
      search: Match.Optional(String),
      sort: Match.Optional(Match.OneOf(null, { field: String, direction: Match.OneOf('asc', 'desc') })),
      page: Match.Optional(Match.Integer),
      pageSize: Match.Optional(Match.Integer),
    });
    await requireRole(this.userId, DOMAIN_ROLES.memberLookup);
    return memberListPage({ ...options, sort: options.sort || undefined });
  },
});

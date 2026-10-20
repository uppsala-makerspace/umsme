import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Roles } from 'meteor/roles';
import { check, Match } from 'meteor/check';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import { usersPage, userDetail, updateUser, setUserRole, removeUser } from '/imports/common/server/users/users';

Meteor.methods({
  async serverCreateUser(username, password) {
    if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      throw new Meteor.Error('not-authorized', 'Only admins can create users');
    }
    await Accounts.createUserAsync({username, password});
    const userId = await Accounts.findUserByUsername(username);
    return userId._id;
  },

  async 'users.page'(options) {
    check(options, {
      search: Match.Optional(String),
      sort: Match.Optional(Match.OneOf(null, { field: String, direction: Match.OneOf('asc', 'desc') })),
      page: Match.Optional(Match.Integer),
      pageSize: Match.Optional(Match.Integer),
    });
    await requireRole(this.userId, DOMAIN_ROLES.users);
    return usersPage({ ...options, sort: options.sort || undefined });
  },
  async 'users.detail'(userId) {
    check(userId, String);
    await requireRole(this.userId, DOMAIN_ROLES.users);
    return { ...(await userDetail(userId)), canSetRoles: await Roles.userIsInRoleAsync(this.userId, 'admin'), self: userId === this.userId };
  },
  async 'users.update'(userId, fields) {
    check(userId, String);
    check(fields, { username: String, email: String });
    await requireRole(this.userId, DOMAIN_ROLES.users);
    await updateUser(userId, fields, { userId: this.userId });
  },
  /** Admin roles are given and taken by admins only, as before. */
  async 'users.setRole'(userId, role, on) {
    check(userId, String);
    check(role, String);
    check(on, Boolean);
    await requireRole(this.userId, ['admin']);
    await setUserRole(userId, role, on, { userId: this.userId });
  },
  async 'users.remove'(userId) {
    check(userId, String);
    await requireRole(this.userId, DOMAIN_ROLES.users);
    await removeUser(userId, { userId: this.userId });
  },
});

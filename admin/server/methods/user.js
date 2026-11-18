import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Roles } from 'meteor/roles';
import { check, Match } from 'meteor/check';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import { usersPage, userDetail, updateUser, setUserRole, removeUser } from '/imports/common/server/users/users';
import { planUserMerge, mergeUsers } from '/imports/common/server/users/merge';

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The account with this address, whatever its case.
const userIdByAddress = async (address) => {
  const user = await Meteor.users.findOneAsync(
    { 'emails.address': { $regex: `^${escape(address.trim())}$`, $options: 'i' } },
    { fields: { _id: 1 } },
  );
  if (!user) throw new Meteor.Error('not-found', `No account has the address ${address}`);
  return user._id;
};

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
  /**
   * Merging another account, found by any of its addresses, into one: admins
   * only, as merging members. What it would do, then doing it; `keptMemberId`
   * picks the member to keep when the two accounts find different ones.
   */
  async 'users.mergePreview'(keptId, removedAddress, keptMemberId) {
    check(keptId, String);
    check(removedAddress, String);
    check(keptMemberId, Match.Maybe(String));
    await requireRole(this.userId, ['admin']);
    return planUserMerge(keptId, await userIdByAddress(removedAddress), { keptMemberId, actorId: this.userId });
  },
  async 'users.merge'(keptId, removedAddress, keptMemberId) {
    check(keptId, String);
    check(removedAddress, String);
    check(keptMemberId, Match.Maybe(String));
    await requireRole(this.userId, ['admin']);
    return mergeUsers(keptId, await userIdByAddress(removedAddress), { keptMemberId, userId: this.userId });
  },
  async 'users.remove'(userId) {
    check(userId, String);
    await requireRole(this.userId, DOMAIN_ROLES.users);
    await removeUser(userId, { userId: this.userId });
  },
});

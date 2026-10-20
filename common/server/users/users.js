import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Members } from '/imports/common/collections/members';
import { Comments } from '/imports/common/collections/comments';
import { memberSelectorForUser } from '/imports/common/lib/memberMatch';
import { recordChange } from '/imports/common/server/auditLog';

/**
 * User accounts (inloggningar) as admin keeps them: the list, an account's
 * username, email and admin roles, and removing one. The bare `admin` login
 * keeps its roles; nobody removes their own account.
 */

export const ADMIN_ROLES = ['admin', 'board', 'treasurer', 'storage'];
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const USER_FIELDS = { username: 1, emails: 1, createdAt: 1 };

const rolesOf = async (userIds) => {
  const assignments = await Meteor.roleAssignment.find({ 'user._id': { $in: userIds }, 'role._id': { $in: ADMIN_ROLES } }).fetchAsync();
  const byUser = {};
  for (const a of assignments) (byUser[a.user._id] ||= []).push(a.role._id);
  return byUser;
};

/** A page of the accounts, searched on username and email, with their admin roles. */
export const usersPage = async ({ search, sort, page = 0, pageSize = 50 }) => {
  if (sort && !['username', 'createdAt'].includes(sort.field)) throw new Meteor.Error('bad-sort', `Cannot sort by "${sort.field}"`);
  const size = Math.min(Math.max(1, pageSize), 200);
  const words = (search || '').trim().split(/\s+/).filter(Boolean).slice(0, 5);
  const selector = words.length
    ? { $and: words.map((w) => ({ $or: [{ username: new RegExp(escape(w), 'i') }, { 'emails.address': new RegExp(escape(w), 'i') }] })) }
    : {};
  const order = { ...(sort ? { [sort.field]: sort.direction === 'desc' ? -1 : 1 } : { createdAt: -1 }), _id: 1 };
  const [users, total] = await Promise.all([
    Meteor.users.find(selector, { fields: USER_FIELDS, sort: order, skip: Math.max(0, page) * size, limit: size }).fetchAsync(),
    Meteor.users.find(selector).countAsync(),
  ]);
  const roles = await rolesOf(users.map((u) => u._id));
  return { rows: users.map((u) => ({ _id: u._id, username: u.username || '', email: u.emails?.[0]?.address || '', createdAt: u.createdAt, roles: roles[u._id] || [] })), total };
};

const userOf = async (userId) => {
  const user = await Meteor.users.findOneAsync(userId, { fields: USER_FIELDS });
  if (!user) throw new Meteor.Error('not-found', 'No such user');
  return user;
};

/** An account, its admin roles, and the member it is. */
export const userDetail = async (userId) => {
  const user = await userOf(userId);
  const roles = (await rolesOf([userId]))[userId] || [];
  const member = await Members.findOneAsync(memberSelectorForUser(user), { fields: { name: 1 } });
  return { user, roles, member: member || null };
};

/** Change the username and the first email; a changed email is unverified until the user verifies it. */
export const updateUser = async (userId, { username, email }, { userId: actor }) => {
  const before = await userOf(userId);
  const name = (username || '').trim();
  const address = (email || '').trim().toLowerCase();
  if (!name && !address) throw new Meteor.Error('bad-user', 'An account needs a username or an email');
  if (name && name !== before.username && (await Meteor.users.findOneAsync({ username: name, _id: { $ne: userId } }))) {
    throw new Meteor.Error('username-taken', 'Another account has this username');
  }
  const current = before.emails?.[0];
  const emails = address
    ? [{ address, verified: current?.address === address ? !!current.verified : false }, ...(before.emails || []).slice(1)]
    : (before.emails || []).slice(1);
  await Meteor.users.updateAsync(userId, { ...(name ? { $set: { username: name, emails } } : { $set: { emails }, $unset: { username: '' } }) });
  await recordChange({ userId: actor, domain: 'users', action: 'update', docId: userId, before, after: await userOf(userId) });
};

/** Give an account an admin role, or take it away; never from the bare admin login. */
export const setUserRole = async (userId, role, on, { userId: actor }) => {
  if (!ADMIN_ROLES.includes(role)) throw new Meteor.Error('bad-role', `No admin role "${role}"`);
  const user = await userOf(userId);
  if (user.username === 'admin') throw new Meteor.Error('admin-login', 'The admin login keeps its roles');
  await Roles.createRoleAsync(role, { unlessExists: true });
  if (on) await Roles.addUsersToRolesAsync(userId, role, null);
  else await Roles.removeUsersFromRolesAsync(userId, role, null);
  await recordChange({ userId: actor, domain: 'users', action: on ? 'addRole' : 'removeRole', docId: userId, after: { role } });
};

/** Remove an account and the comments about it; never your own. */
export const removeUser = async (userId, { userId: actor }) => {
  if (userId === actor) throw new Meteor.Error('own-account', 'You cannot delete your own account');
  const before = await userOf(userId);
  await Comments.removeAsync({ about: userId });
  await Meteor.roleAssignment.removeAsync({ 'user._id': userId });
  await Meteor.users.removeAsync(userId);
  await recordChange({ userId: actor, domain: 'users', action: 'remove', docId: userId, before });
};

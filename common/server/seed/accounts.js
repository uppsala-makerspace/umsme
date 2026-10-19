import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Roles } from 'meteor/roles';

/**
 * A login. Roles are created when missing, so a scenario can hand out
 * "storage" without depending on admin's startup having created it.
 *
 * @param {{ email?: string, username?: string, password: string,
 *           verified?: boolean, roles?: string[] }} options
 * @returns {Promise<string>} the user id
 */
export const makeUser = async ({ email, username, password, verified = true, roles = [] }) => {
  const userId = await Accounts.createUserAsync({
    ...(email ? { email } : {}),
    ...(username ? { username } : {}),
    password,
  });
  if (email && verified) {
    await Meteor.users.updateAsync(userId, { $set: { 'emails.0.verified': true } });
  }
  for (const role of roles) {
    await Roles.createRoleAsync(role, { unlessExists: true });
  }
  if (roles.length > 0) {
    await Roles.addUsersToRolesAsync(userId, roles);
  }
  return userId;
};

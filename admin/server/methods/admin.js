import { Roles } from 'meteor/roles';
import { Accounts } from 'meteor/accounts-base';
import { check } from 'meteor/check';

Meteor.methods({
  /**
   * Set a new password for a user (admin only). The user is logged out on
   * every device, so the new password takes effect right away.
   */
  'setUserPassword': async (userId, password) => {
    if (!Meteor.userId() || !(await Roles.userIsInRoleAsync(Meteor.userId(), 'admin'))) {
      throw new Meteor.Error('not-authorized', 'Admin role required');
    }
    check(userId, String);
    check(password, String);
    if (!password) {
      throw new Meteor.Error('missing-password', 'Enter a password');
    }
    if (!(await Meteor.users.findOneAsync(userId, { fields: { _id: 1 } }))) {
      throw new Meteor.Error('not-found', 'User not found');
    }
    await Accounts.setPasswordAsync(userId, password, { logout: true });
    return true;
  },
});

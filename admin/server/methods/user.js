import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Roles } from 'meteor/roles';

Meteor.methods({
  async serverCreateUser(username, password) {
    if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      throw new Meteor.Error('not-authorized', 'Only admins can create users');
    }
    await Accounts.createUserAsync({username, password});
    const userId = await Accounts.findUserByUsername(username);
    return userId._id;
  }
});
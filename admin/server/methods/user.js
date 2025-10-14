import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';

Meteor.methods({
  async serverCreateUser(username, password) {
    await Accounts.createUserAsync({username, password});
    const userId = await Accounts.findUserByUsername(username);
    return userId._id;
  }
});
import { Roles } from 'meteor/roles';

Meteor.methods({
  'addToAdminGroup': async (id) => {
    if (Meteor.userId() && await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      return Roles.addUsersToRolesAsync(id, "admin", null);
    }
  },
  'removeFromAdminGroup': async (id) => {
    if (Meteor.userId() && await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      return Roles.removeUsersFromRolesAsync(id, "admin", null);
    }
  },
});
import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Roles } from 'meteor/roles';

export default async () => {
  let adminUser = await Accounts.findUserByUsername('admin');
  if (adminUser) {
    await Accounts.setPasswordAsync(
      adminUser._id,
      Meteor.settings?.adminpassword || 'adminadmin'
    );
  } else {
    await Accounts.createUserAsync({
      username: 'admin',
      password: Meteor.settings?.adminpassword || 'adminadmin',
    });
    adminUser = await Accounts.findUserByUsername('admin');
  }
  await Roles.createRoleAsync('admin', { unlessExists: true });
  await Roles.addUsersToRolesAsync(adminUser._id, 'admin', null);
};
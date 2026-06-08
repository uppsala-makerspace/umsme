import { Roles } from 'meteor/roles';
import { Members } from '/imports/common/collections/members';

Meteor.methods({
  'lowercaseMemberEmails': async () => {
    if (!Meteor.userId() || !(await Roles.userIsInRoleAsync(Meteor.userId(), 'admin'))) {
      throw new Meteor.Error('not-authorized', 'Admin role required');
    }
    const members = await Members.find(
      { email: { $exists: true } },
      { fields: { email: 1 } }
    ).fetchAsync();
    let updated = 0;
    let conflicts = 0;
    for (const m of members) {
      if (!m.email) continue;
      const lower = m.email.toLowerCase();
      if (lower === m.email) continue;
      const existing = await Members.findOneAsync({ email: lower, _id: { $ne: m._id } });
      if (existing) {
        conflicts += 1;
        console.warn(
          `lowercaseMemberEmails: conflict for "${m.email}" — "${lower}" already taken by member ${existing._id}`
        );
        continue;
      }
      await Members.updateAsync(m._id, { $set: { email: lower } });
      updated += 1;
    }
    return { scanned: members.length, updated, conflicts };
  },


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
  'addToBoardGroup': async (id) => {
    if (Meteor.userId() && await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      return Roles.addUsersToRolesAsync(id, "board", null);
    }
  },
  'removeFromBoardGroup': async (id) => {
    if (Meteor.userId() && await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      return Roles.removeUsersFromRolesAsync(id, "board", null);
    }
  },
  'addToTreasurerGroup': async (id) => {
    if (Meteor.userId() && await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      return Roles.addUsersToRolesAsync(id, "treasurer", null);
    }
  },
  'removeFromTreasurerGroup': async (id) => {
    if (Meteor.userId() && await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      return Roles.removeUsersFromRolesAsync(id, "treasurer", null);
    }
  },
});
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { syncLinkedRoleById } from '/imports/common/server/linkedRoleSync';

const requireRole = async (roles) => {
  if (!Meteor.userId() || !(await Roles.userIsInRoleAsync(Meteor.userId(), roles))) {
    throw new Meteor.Error('not-authorized', 'Insufficient role');
  }
};

Meteor.methods({
  /**
   * Re-sync a group's linked role from its active membership. Called by the
   * admin UI after membership edits or after the group form is saved (the
   * linkedRole field may have changed). Group membership is the source of
   * truth for linked roles — manual role edits are overwritten here.
   */
  'adminGroups.syncLinkedRole': async (groupId) => {
    await requireRole(['admin', 'board']);
    await syncLinkedRoleById(groupId);
    return true;
  },
});

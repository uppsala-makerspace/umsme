import { updateMember } from '/imports/common/lib/utils';
import { Members } from '/imports/common/collections/members.js';

Meteor.methods({
  'updateMembers': async () => {
    if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      throw new Meteor.Error('Not authorized');
    }
    await Members.find().forEachAsync((mb) => {
      // We are not waiting for this one to complete, forEachAsync does not have support for that
      updateMember(mb);
    });
  }
});

import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { updateMember } from '/imports/common/lib/utils';
import { Members } from '/imports/common/collections/members.js';

Meteor.methods({
  /** Every member's dates, figured again from their memberships; resolves to how many. */
  'updateMembers': async () => {
    if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      throw new Meteor.Error('Not authorized');
    }
    const members = await Members.find().fetchAsync();
    for (const member of members) await updateMember(member);
    return members.length;
  }
});

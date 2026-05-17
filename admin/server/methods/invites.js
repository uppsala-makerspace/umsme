import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import Invites from '/imports/common/collections/Invites';

Meteor.methods({
  async 'adminCancelInvite'({ inviteId }) {
    if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), ['admin', 'board'])) {
      throw new Meteor.Error('Not authorized');
    }
    const invite = await Invites.findOneAsync(inviteId);
    if (!invite) {
      throw new Meteor.Error('no-invite', 'Invite not found');
    }
    await Invites.removeAsync(inviteId);
  },
});

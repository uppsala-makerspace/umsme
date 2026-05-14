import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { runDoorUnlockSyncAndMail } from '../cronjob/syncAndMailUnlocks';

Meteor.methods({
  async 'forceSyncDoorUnlocks'() {
    if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      throw new Meteor.Error('Not authorized');
    }
    return await runDoorUnlockSyncAndMail();
  },
});

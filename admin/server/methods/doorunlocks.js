import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Unlocks } from '/imports/common/collections/unlocks';
import { DoorUnlocks } from '/imports/common/collections/doorunlocks';
import { Members } from '/imports/common/collections/members';
import { runDoorUnlockSyncAndMail } from '../cronjob/syncAndMailUnlocks';

Meteor.methods({
  async 'forceSyncDoorUnlocks'() {
    if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      throw new Meteor.Error('Not authorized');
    }
    return await runDoorUnlockSyncAndMail();
  },

  async 'migrateUnlocksToDoorUnlocks'() {
    if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      throw new Meteor.Error('Not authorized');
    }

    const legacy = await Unlocks.find({}).fetchAsync();
    const result = { scanned: legacy.length, withMember: 0, withExtid: 0, skipped: 0 };

    for (const row of legacy) {
      const timestamp = row.timestamp;
      const existing = await DoorUnlocks.findOneAsync({ timestamp, door: 'outerDoor' });
      if (existing) {
        result.skipped += 1;
        continue;
      }

      const username = row.username || '';
      const colonLocation = username.lastIndexOf(':');
      const cleaned = colonLocation === -1 ? username : username.substring(0, colonLocation);

      const member = cleaned ? await Members.findOneAsync({ email: cleaned }) : null;
      const doc = { timestamp, door: 'outerDoor', method: 'danalock' };
      if (member) {
        doc.memberid = member._id;
        result.withMember += 1;
      } else {
        doc.extid = `${row.user}-${cleaned}`;
        result.withExtid += 1;
      }
      await DoorUnlocks.insertAsync(doc);
    }

    await Unlocks.removeAsync({});

    return result;
  },
});

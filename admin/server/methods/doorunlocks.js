import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Unlocks } from '/imports/common/collections/unlocks';
import { DoorUnlocks } from '/imports/common/collections/doorunlocks';
import { Members } from '/imports/common/collections/members';
import { check, Match } from 'meteor/check';
import { runDoorUnlockSyncAndMail } from '../cronjob/syncAndMailUnlocks';
import { lockVisits } from '../lock/visits';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import { doorUnlocksPage, recordedVisits, visitBuckets } from '/imports/common/server/doors/doorUnlocks';

Meteor.methods({
  /** A page of the door openings. */
  async 'doorUnlocks.page'(options) {
    check(options, {
      search: Match.Optional(String),
      sort: Match.Optional(Match.OneOf(null, { field: String, direction: Match.OneOf('asc', 'desc') })),
      page: Match.Optional(Match.Integer),
      pageSize: Match.Optional(Match.Integer),
    });
    await requireRole(this.userId, DOMAIN_ROLES.doors);
    return doorUnlocksPage({ ...options, sort: options.sort || undefined });
  },

  /** How many opened the door how often in six months: by the lock's log, or by what is recorded here. */
  async 'doorUnlocks.visits'(source) {
    check(source, Match.OneOf('lock', 'recorded'));
    await requireRole(this.userId, source === 'lock' ? DOMAIN_ROLES.lock : DOMAIN_ROLES.doors);
    return visitBuckets(source === 'lock' ? await lockVisits() : await recordedVisits());
  },

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

import { check } from 'meteor/check';
import { lockApi } from '../lock';
import { lockOverview, fixLockEndDate } from '../lock/overview';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import { recordChange } from '/imports/common/server/auditLog';
import { DoorUnlocks } from '/imports/common/collections/doorunlocks';
import { Members } from '/imports/common/collections/members';

/** Copy the door's latest openings from the lock into DoorUnlocks. */
export const syncUnlocks = async () => {
  const lockLog = await lockApi().log({ page: 0, perPage: 50 });
  let importedCount = 0;
  for(let i=0; i<lockLog.length;i++) {
    const event = lockLog[i];
    const timestamp = new Date(event.timestamp);
    const existing = await DoorUnlocks.findOneAsync({ timestamp, door: 'outerDoor' });
    if (existing) continue;

    const colonLocation = event.username.lastIndexOf(':');
    const email = colonLocation === -1 ? event.username : event.username.substring(0, colonLocation);
    const member = await Members.findOneAsync({ email });
    const doc = { timestamp, door: 'outerDoor', method: 'danalock' };
    if (member) {
      doc.memberid = member._id;
    } else {
      doc.extid = `${event.user}-${email}`;
      console.warn(`syncUnlocks: no member with email "${email}" (raw "${event.username}", user "${event.user}") — storing as extid "${doc.extid}"`);
    }
    await DoorUnlocks.insertAsync(doc);
    importedCount += 1;
  }
  return importedCount;
};

Meteor.methods({
  /** Every lab member against what the lock holds for them. */
  async 'lock.overview'() {
    await requireRole(this.userId, DOMAIN_ROLES.lock);
    return lockOverview();
  },

  /** Set the lock's end date for a member to their lab end date. */
  async 'lock.fix'(memberId) {
    check(memberId, String);
    await requireRole(this.userId, DOMAIN_ROLES.lock);
    await fixLockEndDate(memberId);
    await recordChange({ userId: this.userId, domain: 'lock', action: 'fixEndDate', docId: memberId });
  },
});

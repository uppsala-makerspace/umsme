import { lockApi } from '../lock';
import { DoorUnlocks } from '/imports/common/collections/doorunlocks';
import { Members } from '/imports/common/collections/members';
import { Email } from 'meteor/email';
import { isEmailAllowed } from '/imports/common/server/emailGuard';

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
  'syncLockHistory': async () => {
    if (Meteor.userId() && await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      return syncUnlocks();
    }
  },
  'syncAndMailLockHistory': async () => {
    if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      throw new Meteor.Error('Not authorized');
    }
    await syncUnlocks();
    const today = new Date();
    const yesterday = new Date();
    yesterday.setHours(-25);
    const unlocks = await DoorUnlocks.find({
      'timestamp': {
        $gte: yesterday,
        $lt: today
      }
    }).fetchAsync();

    const log = unlocks.map(t => `${t.timestamp.toISOString()} ${t.door} ${t.memberid}`).join("\n");
    const message = `${unlocks.length} låsöppningar av ytterdörren från ${yesterday.toISOString()} till ${today.toISOString()}\n\n${log}`;
    if (!isEmailAllowed('mpalmer@gmail.com')) {
      console.log('Lock history email blocked by whitelist');
      return message;
    }
    return Email.sendAsync({to: 'mpalmer@gmail.com', from: 'ums@uppsalamakerspace.se', subject: 'Låsöppningar UMS', text: message })
  },
  'lockHistory': async () => {
    if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      throw new Meteor.Error('Not authorized');
    }
    const afterDate = new Date();
    afterDate.setMonth(afterDate.getMonth()-6);
    let isAfter = true;
    let page = 0;
    let visits = [];
    while (isAfter) {
      console.log(`Fetching page ${page}`);
      const lockOpenings = await lockApi().log({ page, perPage: 50 });
      page ++;
      visits = visits.concat(lockOpenings);
      if (lockOpenings.length === 0) {
        isAfter = false;
      } else {
        const lastDate = new Date(lockOpenings[lockOpenings.length - 1].timestamp);
        isAfter = lastDate > afterDate;
      }
    }

    return visits;
  },
  'lockStatus': async () => {
    if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      throw new Meteor.Error('Not authorized');
    }
    return lockApi().status();
  },
  'setCalenderEndDate': async (calendar, endDate, link) => {
    if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      throw new Meteor.Error('Not authorized');
    }
    await lockApi().setCalendarEndDate(calendar, endDate, link);
  },

  'createCalendarEndDate': async (userid, endDate) => {
    if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      throw new Meteor.Error('Not authorized');
    }
    await lockApi().createCalendarEndDate(userid, endDate);
  }
});


/* group_user_links example JSON expression
 {
   calendar_id: "calendar-7c786e1ec60a"
   group_id: "group-53bf19ebcddb"
   id: "group_user-ddbd0292fea2"
   link_profile: "user"
   user_id: "user-ea5a1fcc5fe4"
 }

lock_user_links
 {
   calendar_id: null
   id: "lock_user-7724313e6f1e"
   link_profile: "administrator"
   lock_id: "lock-fde72d8df2e0"
   user_id: "user-0366ba845fb5"
 }
*/
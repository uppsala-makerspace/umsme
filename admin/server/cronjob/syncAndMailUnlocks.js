import { DoorUnlocks } from '/imports/common/collections/doorunlocks';
import { Email } from 'meteor/email'
import { authenticate, syncUnlocks } from "../methods/lock";
import { SyncedCron } from 'meteor/chatra:synced-cron';
import { isEmailAllowed } from '/imports/common/server/emailGuard';

if (Meteor.isServer) {
  SyncedCron.add({
    name: 'Sync unlocks and send a mail',
    schedule: function (parser) {
      return parser.recur().on(3).hour();
    },
    job: async function () {
      await authenticate();
      await syncUnlocks();
      const today = new Date();
      const yesterday = new Date();
      yesterday.setHours(-23);
      const unlocks = await DoorUnlocks.find({
        'timestamp': {
          $gte: yesterday,
          $lt: today
        }
      }).fetchAsync();

      const log = unlocks.map(t => `${t.timestamp.toISOString()} ${t.door} ${t.memberid}`).join("\n");
      const message = `${unlocks.length} låsöppningar från ${yesterday.toISOString()} till ${today.toISOString()}\n\n${log}`;

      const mailConfig = Meteor.settings.private?.doorunlockMail;
      if (!mailConfig?.enabled) {
        return message;
      }
      const recipients = mailConfig.recipients || [];
      const from = mailConfig.from || 'kansliet@uppsalamakerspace.se';
      for (const to of recipients) {
        if (isEmailAllowed(to)) {
          await Email.sendAsync({
            to,
            from,
            subject: 'Låsöppningar UMS',
            text: message
          });
        } else {
          console.log(`Cronjob email to ${to} blocked by whitelist`);
        }
      }
      return message;
    }
  });
}

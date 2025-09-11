import { Unlocks } from '/imports/common/collections/unlocks';
import { Email } from 'meteor/email'
import { authenticate, syncUnlocks } from "../methods/lock";
import { SyncedCron } from 'meteor/chatra:synced-cron';

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
      const unlocks = await Unlocks.find({
        'timestamp': {
          $gte: yesterday,
          $lt: today
        }
      }).fetchAsync();

      const log = unlocks.map(t => `${t.timestamp.toISOString()} ${t.user}`).join("\n");
      const message = `${unlocks.length} låsöppningar av ytterdörren från ${yesterday.toISOString()} till ${today.toISOString()}\n\n${log}`;
      await Email.sendAsync({
        to: 'pass@ekebyindustrihus.com',
        from: 'kansliet@uppsalamakerspace.se',
        subject: 'Låsöppningar UMS',
        text: message
      });
      await Email.sendAsync({
        to: 'mpalmer@gmail.com',
        from: 'kansliet@uppsalamakerspace.se',
        subject: 'Låsöppningar UMS',
        text: message
      });
      return message;
    }
  });

  SyncedCron.start();
}
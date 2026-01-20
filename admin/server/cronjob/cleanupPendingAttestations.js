import { Attestations } from '/imports/common/collections/attestations';
import { SyncedCron } from 'meteor/chatra:synced-cron';

// Time in milliseconds after which pending requests without comments are removed
const PENDING_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours

if (Meteor.isServer) {
  SyncedCron.add({
    name: 'Cleanup expired pending attestations',
    schedule: function (parser) {
      return parser.recur().every(20).minute();
    },
    job: async function () {
      const expiryTime = new Date(Date.now() - PENDING_EXPIRY_MS);
      const result = await Attestations.removeAsync({
        certifierId: { $exists: false },
        comment: { $exists: false },
        startDate: { $lt: expiryTime },
      });
      return `Removed ${result} expired pending attestations`;
    }
  });
}

import { Meteor } from 'meteor/meteor';
import { SyncedCron } from 'meteor/chatra:synced-cron';
import { loadAllTests } from '/imports/common/server/tests/loader';

if (Meteor.isServer) {
  Meteor.startup(() => loadAllTests());

  SyncedCron.add({
    name: 'Reload test questions from disk',
    schedule: function (parser) {
      return parser.cron('5 * * * *');
    },
    job: function () {
      loadAllTests();
      return 'reloaded test questions';
    },
  });
}

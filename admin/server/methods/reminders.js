import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { runReminderJob } from '../cronjob/sendReminders';

Meteor.methods({
  async 'reminders.runNow'() {
    if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), ['admin', 'board'])) {
      throw new Meteor.Error('Not authorized');
    }
    return await runReminderJob();
  },
});

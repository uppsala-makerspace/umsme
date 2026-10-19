import { Meteor } from 'meteor/meteor';

/**
 * Data for the member lists. The pages' containers use this; the pure
 * components never do.
 */

/** A page of a member list view: 'all', 'excluded' or 'reminders'. */
export const memberPage = (view) => ({ page, pageSize, sort, search }) =>
  Meteor.callAsync('adminMembers.page', { view, page, pageSize, sort, search });

export const runReminderJob = () => Meteor.callAsync('reminders.runNow');

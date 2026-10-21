import { Meteor } from 'meteor/meteor';

/** The statistics pages' figures, worked out on the server. */
export const memberHistory = () => Meteor.callAsync('stats.history');
export const membershipStatistics = (interval) => Meteor.callAsync('stats.memberships', interval);
export const revenue = () => Meteor.callAsync('stats.revenue');

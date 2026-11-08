import { Meteor } from 'meteor/meteor';

/** A page of the door openings. */
export const doorUnlocksPage = ({ page, pageSize, sort, search }) =>
  Meteor.callAsync('doorUnlocks.page', { page, pageSize, sort, search });

/** Door visits per day, month, quarter or year: query { view, month?, year? }. */
export const doorVisitStats = (query) => Meteor.callAsync('doorStats.visits', query);

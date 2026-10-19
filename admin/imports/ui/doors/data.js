import { Meteor } from 'meteor/meteor';

/** A page of the door openings. */
export const doorUnlocksPage = ({ page, pageSize, sort, search }) =>
  Meteor.callAsync('doorUnlocks.page', { page, pageSize, sort, search });

/** How many opened the door how often: source 'lock' (its log) or 'recorded' (here). */
export const doorVisits = (source) => Meteor.callAsync('doorUnlocks.visits', source);

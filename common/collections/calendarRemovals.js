import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

/**
 * Calendar events whose event was removed: the calendar sync removes them
 * from the calendar too (common/server/activities/calendarSync.js). No allow
 * rules: only the server writes them.
 */
export const CalendarRemovals = new Mongo.Collection('calendarRemovals');
CalendarRemovals.attachSchema(schemas.calendarRemoval);

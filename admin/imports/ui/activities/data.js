import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { Activities } from '/imports/common/collections/activities';
import { Events } from '/imports/common/collections/events';
import { ActivityCategories } from '/imports/common/collections/activityCategories';
import { uploadImage } from '../groups/choices';
import { activityFields, eventFields, categoryFields } from './values';

/**
 * Data for the activity, event and category pages: the narrow publications
 * and the methods. The pages' containers use this; the pure components never do.
 */

const byName = (a, b) => (a.name?.sv || '').localeCompare(b.name?.sv || '', 'sv');
const bySortOrder = (a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity) || byName(a, b);

export const useActivityList = () => useTracker(() => {
  const handle = Meteor.subscribe('admin.activities.list');
  return { loading: !handle.ready(), activities: Activities.find().fetch() };
}, []);

/** One whole activity and its events; none when there is no id (a new one). */
export const useActivity = (docId) => useTracker(() => {
  if (!docId) return { loading: false, activity: null, events: [] };
  const handle = Meteor.subscribe('admin.activities.activity', docId);
  return { loading: !handle.ready(), activity: Activities.findOne(docId), events: Events.find({ activityId: docId }).fetch() };
}, [docId]);

export const useEventList = () => useTracker(() => {
  const handle = Meteor.subscribe('admin.events.list');
  return { loading: !handle.ready(), events: Events.find().fetch(), activities: Activities.find().fetch() };
}, []);

/** One whole event; none when there is no id (a new one). */
export const useEvent = (docId) => useTracker(() => {
  if (!docId) return { loading: false, event: null };
  const handle = Meteor.subscribe('admin.events.event', docId);
  return { loading: !handle.ready(), event: Events.findOne(docId) };
}, [docId]);

/** The activities an event can be of, by name, as the event pages choose among them. */
export const useActivityChoices = () => useTracker(() => {
  const handle = Meteor.subscribe('admin.activities.list');
  return { loading: !handle.ready(), activities: Activities.find({}, { fields: { name: 1, groupId: 1 } }).fetch().sort(byName) };
}, []);

export const useCategories = () => useTracker(() => {
  const handle = Meteor.subscribe('admin.activityCategories.list');
  return { loading: !handle.ready(), categories: ActivityCategories.find().fetch().sort(bySortOrder) };
}, []);

/** Create an activity (resolves to its id), or update one if an activity is given. */
export const saveActivity = (values, activity) => (activity
  ? Meteor.callAsync('activities.update', activity._id, activityFields(values), activity.updatedAt ?? null)
  : Meteor.callAsync('activities.create', activityFields(values)));

export const removeActivity = (docId) => Meteor.callAsync('activities.remove', docId);
export const uploadActivityImage = (docId, file) => uploadImage('activities.uploadImage', docId, file);
export const removeActivityImage = (docId) => Meteor.callAsync('activities.removeImage', docId);

/** Create an event (resolves to its id), or update one if an event is given. */
export const saveEvent = (values, event) => (event
  ? Meteor.callAsync('events.update', event._id, eventFields(values), event.updatedAt ?? null)
  : Meteor.callAsync('events.create', eventFields(values)));

export const removeEvent = (docId) => Meteor.callAsync('events.remove', docId);
export const uploadEventImage = (docId, file) => uploadImage('events.uploadImage', docId, file);
export const removeEventImage = (docId) => Meteor.callAsync('events.removeImage', docId);

export const saveCategory = (values, category) => (category
  ? Meteor.callAsync('activityCategories.update', category._id, categoryFields(values), category.updatedAt ?? null)
  : Meteor.callAsync('activityCategories.create', categoryFields(values)));

export const removeCategory = (docId) => Meteor.callAsync('activityCategories.remove', docId);

export const activityImageUrl = (activity) => (activity?.imageFileId
  ? `/api/activities/${activity._id}/image?v=${encodeURIComponent(activity.imageFileId)}`
  : null);

/** The image an event shows: its own, or else its activity's, which /api/events serves too. */
export const eventImageUrl = (event, activity) => {
  const fileId = event?.imageFileId || activity?.imageFileId;
  return fileId ? `/api/events/${event._id}/image?v=${encodeURIComponent(fileId)}` : null;
};

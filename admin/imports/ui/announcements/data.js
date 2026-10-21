import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { Announcements } from '/imports/common/collections/announcements';

/**
 * Data for the announcement pages: the narrow publications and the methods.
 * The pages' containers use this; the pure components never do.
 */

export const useAnnouncementList = () => useTracker(() => {
  const handle = Meteor.subscribe('admin.announcements.list');
  return {
    loading: !handle.ready(),
    announcements: Announcements.find({}, { fields: { type: 1, subjectSv: 1, status: 1, createdAt: 1, sentAt: 1 } }).fetch(),
  };
}, []);

/** One whole announcement; none when there is no id (a new one). */
export const useAnnouncement = (docId) => useTracker(() => {
  if (!docId) return { loading: false, announcement: null };
  const handle = Meteor.subscribe('admin.announcements.announcement', docId);
  return { loading: !handle.ready(), announcement: Announcements.findOne(docId) };
}, [docId]);

/** The form's values for an announcement, or empty ones for a new one. */
export const formValues = (announcement) => ({
  type: announcement?.type || 'newsletter',
  subjectSv: announcement?.subjectSv || '',
  subjectEn: announcement?.subjectEn || '',
  bodySv: announcement?.bodySv || '',
  bodyEn: announcement?.bodyEn || '',
});

/** Create a draft (resolves to its id), or update one if an announcement is given. */
export const saveAnnouncement = (values, announcement) => (announcement
  ? Meteor.callAsync('announcements.update', announcement._id, values, announcement.updatedAt ?? null)
  : Meteor.callAsync('announcements.create', values));

export const removeAnnouncement = (docId) => Meteor.callAsync('announcements.remove', docId);

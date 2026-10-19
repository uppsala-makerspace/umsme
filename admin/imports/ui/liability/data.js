import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { LiabilityDocuments } from '/imports/common/collections/liabilityDocuments';

/**
 * Data for the liability pages, the same whichever components draw them:
 * the narrow publications, the methods, and dates as the date field shows
 * them.
 */

/** The versions, newest first: only title and date. */
export const useLiabilityList = () => useTracker(() => {
  const handle = Meteor.subscribe('admin.liability.list');
  return {
    loading: !handle.ready(),
    documents: LiabilityDocuments.find({}, { sort: { date: -1 }, fields: { title: 1, date: 1 } }).fetch(),
  };
}, []);

/** One whole version; none when there is no id (a new version). */
export const useLiabilityDocument = (docId) => useTracker(() => {
  if (!docId) return { loading: false, document: null };
  const handle = Meteor.subscribe('admin.liability.document', docId);
  return { loading: !handle.ready(), document: LiabilityDocuments.findOne(docId) };
}, [docId]);

/**
 * A date as YYYY-MM-DD, for the date field and the list. Read in UTC: the
 * date field stores the chosen day at midnight UTC.
 */
export const toDateInput = (date) => (date ? new Date(date).toISOString().substring(0, 10) : '');

/** The value of a date field as a Date at midnight UTC, or null if empty. */
export const fromDateInput = (value) => (value ? new Date(`${value}T00:00:00Z`) : null);

/** The form's values for a version, or empty ones for a new version. */
export const formValues = (document) => ({
  title: document?.title || '',
  date: toDateInput(document?.date),
  sv: document?.text?.sv || '',
  en: document?.text?.en || '',
});

const fieldsFrom = ({ title, date, sv, en }) => ({ title, date: fromDateInput(date), text: { sv, en } });

/** Create a version, or update one if a document is given. */
export const saveLiabilityDocument = (values, document) => (document
  ? Meteor.callAsync('liability.update', document._id, fieldsFrom(values), document.updatedAt ?? null)
  : Meteor.callAsync('liability.create', fieldsFrom(values)));

export const removeLiabilityDocument = (docId) => Meteor.callAsync('liability.remove', docId);

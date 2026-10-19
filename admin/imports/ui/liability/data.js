import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { LiabilityDocuments } from '/imports/common/collections/liabilityDocuments';
import { toDateInput, fromDateInput } from './dates';

/**
 * Data for the liability pages: the narrow publications and the methods.
 * The pages' containers use this; the pure components never do.
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
